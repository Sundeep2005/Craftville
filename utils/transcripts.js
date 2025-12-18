const { createTranscript } = require("discord-html-transcripts");

async function buildTranscript(channel) {
  return createTranscript(channel, {
    limit: -1,
    returnType: "attachment",
    filename: `transcript-${channel.id}.html`,
    saveImages: true
  });
}

module.exports = { buildTranscript };