const env = {};

switch (process.platform) {
  case 'linux':
    if (process.arch === 'x64') {
      env.npm_config_pack_type = 'linux64';
    } else {
      env.npm_config_pack_type = 'linux32';
    }
    break;
  case 'win32':
    if (process.arch === 'x64') {
      env.npm_config_pack_type = 'win64';
    } else {
      env.npm_config_pack_type = 'win32';
    }
    break;
  case 'darwin':
    env.npm_config_pack_type = 'mac';
    break;
  default:
}

module.exports = env;
