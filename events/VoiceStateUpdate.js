const { Events, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const tempChannelsStore = require('../utils/tempChannelStore');
const settings = require('../settings.json');

const CREATE_VOICE_CHANNEL_ID = settings.channels.createVoiceChannel;

const deleteTimers = new Map();

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {

    const guild = newState.guild;

    if (newState.channelId === CREATE_VOICE_CHANNEL_ID) {
      const member = newState.member;
      const kanaalNaam = `Privé kanaal - ${member.user.username}`;
      const everyoneRole = guild.roles.everyone;

      const permissionOverwrites = [
        {
          id: everyoneRole.id,
          deny: [PermissionFlagsBits.Connect],
        },
        {
          id: member.id,
          allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers],
        },
      ];

      try {
        const parentCategory = newState.channel.parentId;

        const tempChannel = await guild.channels.create({
          name: kanaalNaam,
          type: ChannelType.GuildVoice,
          parent: parentCategory,
          permissionOverwrites,
          userLimit: 0,
        });

        await member.voice.setChannel(tempChannel);

        await tempChannelsStore.create(member.id, tempChannel.id);

      } catch (error) {
        console.error('Fout bij maken tempchannel:', error);
      }
      return;
    }

    if (newState.channelId) {
      const ownerId = await tempChannelsStore.findByChannel(newState.channelId);
      if (ownerId && newState.member.id === ownerId) {
        const existingTimer = deleteTimers.get(newState.channelId);
        if (existingTimer) {
          clearTimeout(existingTimer);
          deleteTimers.delete(newState.channelId);
          console.log(`[TempVoice] Timer geannuleerd voor kanaal ${newState.channelId} - eigenaar is terug`);
        }
      }
    }

    if (oldState.channelId) {
      const ownerId = await tempChannelsStore.findByChannel(oldState.channelId);
      if (!ownerId) return;

      const channel = oldState.channel;
      if (!channel) return;

      if (oldState.member.id === ownerId) {
        if (channel.members.size === 0) {
          await channel.delete().catch(() => {});
          await tempChannelsStore.delete(oldState.channelId);
          console.log(`[TempVoice] Kanaal ${oldState.channelId} direct verwijderd - leeg`);
        } else {
          const existingTimer = deleteTimers.get(oldState.channelId);
          if (existingTimer) {
            clearTimeout(existingTimer);
          }

          const timer = setTimeout(async () => {
            try {
              const stillExists = guild.channels.cache.get(oldState.channelId);
              if (stillExists) {
                await stillExists.delete().catch(() => {});
                await tempChannelsStore.delete(oldState.channelId);
                console.log(`[TempVoice] Kanaal ${oldState.channelId} verwijderd na 30 minuten`);
              }
            } catch (error) {
              console.error('[TempVoice] Fout bij verwijderen kanaal:', error);
            }
            deleteTimers.delete(oldState.channelId);
          }, 30 * 60 * 1000);

          deleteTimers.set(oldState.channelId, timer);
          console.log(`[TempVoice] Timer gestart voor kanaal ${oldState.channelId} - 30 minuten`);
        }
      } else if (channel.members.size === 0) {
        const existingTimer = deleteTimers.get(oldState.channelId);
        if (existingTimer) {
          clearTimeout(existingTimer);
          deleteTimers.delete(oldState.channelId);
        }

        await channel.delete().catch(() => {});
        await tempChannelsStore.delete(oldState.channelId);
        console.log(`[TempVoice] Kanaal ${oldState.channelId} direct verwijderd - leeg`);
      }
    }
  }
};