const { QuickDB } = require('quick.db');
const db = new QuickDB({ filePath: './/tempChannels.sqlite' });

class TempChannelsStore {
  async create(ownerId, channelId) {
    await db.set(`tempChannel_${channelId}`, ownerId);
  }

  async delete(channelId) {
    await db.delete(`tempChannel_${channelId}`);
  }

  async has(channelId) {
    const owner = await db.get(`tempChannel_${channelId}`);
    return owner !== null && owner !== undefined;
  }

  async findByOwner(ownerId) {
    const allKeys = await db.all();
    for (const entry of allKeys) {
      if (entry.id.startsWith('tempChannel_') && entry.value === ownerId) {
        return entry.id.replace('tempChannel_', '');
      }
    }
    return null;
  }

  async findByChannel(channelId) {
    const ownerId = await db.get(`tempChannel_${channelId}`);
    return ownerId || null;
  }

  async getAll() {
    const allKeys = await db.all();
    const channels = {};
    for (const entry of allKeys) {
      if (entry.id.startsWith('tempChannel_')) {
        const channelId = entry.id.replace('tempChannel_', '');
        channels[channelId] = entry.value;
      }
    }
    return channels;
  }
}

module.exports = new TempChannelsStore();