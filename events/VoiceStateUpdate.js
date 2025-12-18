const { Events, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const tempChannelsStore = require('../utils/tempChannelStore');
const settings = require('../settings.json');

const CREATE_VOICE_CHANNEL_ID = settings.channels.createVoiceChannel;

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

    if (oldState.channelId) {
      const ownerId = await tempChannelsStore.findByChannel(oldState.channelId);
      if (!ownerId) return;

      const channel = oldState.channel;
      if (!channel) return;

      if (oldState.member.id === ownerId || channel.members.size === 0) {
        await channel.delete().catch(() => {});
        await tempChannelsStore.delete(oldState.channelId);
      }
    }
  }
};