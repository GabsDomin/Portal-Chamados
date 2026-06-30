function getEnv(name, aliases = []) {
  const value = process.env[name] || aliases.map((alias) => process.env[alias]).find(Boolean);
  return typeof value === "string" ? value.trim() : value;
}

module.exports = { getEnv };
