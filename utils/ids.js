function isValidSnowflake(id) {
  return typeof id === "string" && /^[0-9]{17,20}$/.test(id);
}

module.exports = { isValidSnowflake };