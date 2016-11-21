const path = require('path');
const childProcess = require('child_process');

const gulp = require('gulp');
const usage = require('gulp-help-doc');
const install = require('gulp-install');
const concat = require('gulp-concat');
const ngAnnotate = require('gulp-ng-annotate');
const uglify = require('gulp-uglify');
const nwb = require('nwjs-builder');
const jeditor = require('gulp-json-editor');
const replace = require('gulp-replace');
const env = require('gulp-env');
const minimist = require('minimist');
const eventStream = require('event-stream');
const runSequence = require('run-sequence');
const del = require('del');

const webpack = require('gulp-webpack');
const insert = require('gulp-insert');

const nwjc = path.resolve('node_modules/nw/nwjs/nwjc');

const argOptions = {
  string: ['version', 'platform', 'wcjs-version', 'suffix'],
  boolean: ['dev', 'design', 'protect'],
  alias: {
    v: 'version',
    p: 'platform',
    s: 'suffix',
  },
  default: {
    'wcjs-version': 'v0.2.6',
    suffix: '',
    dev: false,
    design: false,
    protect: false,
  },
};
switch (process.platform) {
  case 'linux':
    argOptions.default.version = 'v0.12.3';
    argOptions.default.platform = (
      process.arch === 'ia32' ? 'linux32' : 'linux64'
    );
    break;
  case 'darwin':
    argOptions.default.version = 'v0.17.3';
    argOptions.default.platform = 'osx64';
    break;
  case 'win32':
  default:
    argOptions.default.version = 'v0.17.1';
    argOptions.default.platform = process.arch === 'ia32' ? 'win32' : 'win64';
}
const argv = minimist(process.argv.slice(2), argOptions);

const packages = {
  miyoutv: {},
  miyoutvAgent: {},
};
packages.miyoutv.manifest = require('./miyoutv/src/package.json');
packages.miyoutvAgent.manifest = require('./miyoutv-agent/package.json');


packages.miyoutv.buildName = packages.miyoutv.manifest.name;
if (argv.dev) {
  packages.miyoutv.buildName += '-dev';
} else if (argv.design) {
  packages.miyoutv.buildName += '-design';
}
packages.miyoutv.buildName = [
  packages.miyoutv.buildName,
  '-v',
  packages.miyoutv.manifest.version,
  argv.suffix,
  '-',
  argv.platform,
].join('');
packages.miyoutvAgent.buildName = [
  packages.miyoutvAgent.manifest.name,
  '-v',
  packages.miyoutvAgent.manifest.version,
  argv.suffix,
].join('');

gulp.task('default', ['help']);

/**
 * @task {help}
 * @order {0}
 */
gulp.task('help', () => usage(gulp, {
  keysColumnWidth: 60,
}));

/**
 * @task {build}
 * @order {1}
 */
gulp.task('build', ['build:miyoutv', 'build:agent']);

/**
 * @task {build:miyoutv}
 * @order {1}
 * @arg {version,-v <version>} nwjs version
 * @arg {platform,-p <win32|win64|osx64|linux32|linux64>} platform
 * @arg {wcjs-version <wcjs-version>} wcjs version
 * @arg {suffix,-s <suffix>} build suffix
 * @arg {dev} for developpers
 * @arg {design} for designers
 * @arg {protect} code protection
 */
gulp.task('build:miyoutv', (callback) => {
  if (argv.protect && !argv.dev) {
    return runSequence(
      [
        'build:miyoutv:resource',
        'build:miyoutv:bundle',
        'build:miyoutv:scripts',
      ],
      'build:miyoutv:protect',
      'build:miyoutv:pack',
      'build:miyoutv:preinstall',
      callback
    );
  }
  return runSequence(
    ['build:miyoutv:resource', 'build:miyoutv:bundle', 'build:miyoutv:scripts'],
    'build:miyoutv:pack',
    'build:miyoutv:preinstall',
    callback
  );
});

/**
 * @task {build:miyoutv:clean}
 * @order {2}
 */
gulp.task('build:miyoutv:clean', () => del('miyoutv/dist/'));

/**
 * @task {build:miyoutv:clean_all}
 * @order {2}
 */
gulp.task('build:clean_all', () => del(['miyoutv/dist/', 'build/miyoutv/']));

/**
 * @task {build:miyoutv:resource}
 * @order {2}
 */
gulp.task('build:miyoutv:resource', () =>
  gulp
  .src([
    'miyoutv/src/**',
    '!miyoutv/src/app.js',
    '!miyoutv/src/app/',
    '!miyoutv/src/app/**',
    '!miyoutv/src/bower_components/',
    '!miyoutv/src/bower_components/**',
    '!miyoutv/src/install.sh',
  ])
  .pipe(gulp.dest('miyoutv/dist/'))
);

/**
 * @task {build:miyoutv:bundle}
 * @order {2}
 */
gulp.task('build:miyoutv:bundle', () =>
  gulp
  .src('miyoutv/src/bower.json')
  .pipe(gulp.dest('miyoutv/dist/'))
  .pipe(install())
);

/**
 * @task {build:miyoutv:scripts}
 * @order {2}
 */
gulp.task('build:miyoutv:scripts', () => {
  if (argv.dev) {
    return gulp
      .src([
        'miyoutv/src/app.js',
        'miyoutv/src/app/**',
      ], {
        base: 'miyoutv/src/',
      })
      .pipe(gulp.dest('miyoutv/dist/'));
  }
  return gulp
    .src([
      'miyoutv/src/app/main.js',
      'miyoutv/src/app/*/*.js',
    ])
    .pipe(concat('app.js'))
    .pipe(ngAnnotate())
    .pipe(uglify())
    .pipe(gulp.dest('miyoutv/dist/'));
});

/**
 * @task {build:miyoutv:protect}
 * @order {2}
 */
gulp.task('build:miyoutv:protect', (callback) => {
  childProcess.execSync([
    nwjc,
    'miyoutv/dist/app.js',
    'miyoutv/dist/app.bin',
  ].join(' '));
  del('miyoutv/dist/app.js');
  callback();
});

/**
 * @task {build:miyoutv:pack}
 * @order {2}
 */
gulp.task('build:miyoutv:pack', (callback) => {
  let version = argv.version;
  const versionNumber = version.replace(/^v/, '').split('.');
  if (
    (argv.dev || argv.design) &&
    (versionNumber[0] > 0 || versionNumber[1] >= 13)
  ) {
    version += '-sdk';
  }
  nwb.commands.nwbuild('miyoutv/dist/', {
    version,
    platforms: argv.platform,
    outputDir: 'build/miyoutv/',
    outputName: packages.miyoutv.buildName,
    sideBySide: argv.dev || argv.design,
    winIco: 'miyoutv/dist/miyoutv.ico',
    macIcns: 'miyoutv/dist/miyoutv.icns',
  }, callback);
});

/**
 * @task {build:miyoutv:preinstall}
 * @order {2}
 */
gulp.task('build:miyoutv:preinstall', () => {
  const merged = [];
  let buildDir;
  let manifestEditor;
  let installEnv;
  let installOptions;
  switch (argv.platform) {
    case 'win32':
      buildDir = path.resolve('build/miyoutv/', packages.miyoutv.buildName);
      manifestEditor = (json) => {
        const result = json;
        result['wcjs-prebuilt'] = {
          arch: 'ia32',
          platform: 'win',
          version: argv['wcjs-version'],
          runtime: 'nw',
          runtimeVersion: argv.version,
        };
        result.optionalDependencies['webchimera.js'] = json.dependencies['webchimera.js'];
        delete result.dependencies.nw;
        delete result.dependencies['webchimera.js'];
        return result;
      };
      installEnv = {
        WCJS_ARCH: 'ia32',
        WCJS_PLATFORM: 'win',
        WCJS_VERSION: argv['wcjs-version'],
        WCJS_RUNTIME: 'nw',
        WCJS_RUNTIME_VERSION: argv.version,
      };
      installOptions = {
        production: true,
        noOptional: true,
      };
      break;
    case 'win64':
      buildDir = path.resolve('build/miyoutv/', packages.miyoutv.buildName);
      manifestEditor = (json) => {
        const result = json;
        result['wcjs-prebuilt'] = {
          arch: 'x64',
          platform: 'win',
          version: argv['wcjs-version'],
          runtime: 'nw',
          runtimeVersion: argv.version,
        };
        result.optionalDependencies['webchimera.js'] = json.dependencies['webchimera.js'];
        delete result.dependencies.nw;
        delete result.dependencies['webchimera.js'];
        return result;
      };
      installEnv = {
        WCJS_ARCH: 'x64',
        WCJS_PLATFORM: 'win',
        WCJS_VERSION: argv['wcjs-version'],
        WCJS_RUNTIME: 'nw',
        WCJS_RUNTIME_VERSION: argv.version,
      };
      installOptions = {
        production: true,
        noOptional: true,
      };
      break;
    case 'osx64':
      buildDir = path.resolve(
        'build/miyoutv/',
        packages.miyoutv.buildName,
        'MiyouTV.app/Contents/Resources/app.nw'
      );
      manifestEditor = (json) => {
        const result = json;
        result['wcjs-prebuilt'] = {
          arch: 'x64',
          platform: 'osx',
          version: argv['wcjs-version'],
          runtime: 'nw',
          runtimeVersion: argv.version,
        };
        result.optionalDependencies['webchimera.js'] = (
          json.dependencies['webchimera.js']
        );
        delete result.dependencies.nw;
        delete result.dependencies['webchimera.js'];
        return result;
      };
      installEnv = {
        WCJS_ARCH: 'x64',
        WCJS_PLATFORM: 'osx',
        WCJS_VERSION: argv['wcjs-version'],
        WCJS_RUNTIME: 'nw',
        WCJS_RUNTIME_VERSION: argv.version,
      };
      installOptions = {
        production: true,
        noOptional: true,
      };
      break;
    case 'linux32':
    case 'linux64':
      buildDir = path.resolve('build/miyoutv/', packages.miyoutv.buildName);
      manifestEditor = (json) => {
        const result = json;
        if (argv.dev || argv.design) {
          result.window.toolbar = true;
        }
        delete result.dependencies.nw;
        delete result.dependencies['wcjs-prebuilt'];
        return result;
      };
      installOptions = {
        production: true,
        ignoreScripts: true,
      };
      merged.push(gulp
        .src('miyoutv/src/install.sh')
        .pipe(replace(
          /(npm_config_wcjs_runtime_version=).*/g,
          `$1"${argv.version.replace(/^v/, '')}"`
        ))
        .pipe(gulp.dest(buildDir, {
          mode: '0755',
        })));
      break;
    default:
  }
  merged.push(gulp
    .src('miyoutv/src/package.json')
    .pipe(jeditor(manifestEditor))
    .pipe(gulp.dest(buildDir))
    .pipe(env.set(installEnv))
    .pipe(install(installOptions)));
  return eventStream.merge(merged);
});

/**
 * @task {build:agent}
 * @order {3}
 */
gulp.task('build:agent', ['build:agent:scripts', 'build:agent:resource']);
/**
 * @task {build:agent:scripts}
 * @order {3}
 */
gulp.task('build:agent:scripts', () => {
  const merged = [];
  const buildDir = path.resolve(
    'build/miyoutv-agent/', packages.miyoutvAgent.buildName
  );
  merged.push(gulp
    .src('miyoutv-agent/src/miyoutv-agent.js')
    .pipe(webpack({
      output: {
        filename: 'miyoutv-agent.js',
      },
      target: 'node',
      node: {
        console: false,
        global: false,
        process: false,
        Buffer: false,
        __filename: false,
        __dirname: false,
      },
    }))
    // .pipe(uglify({
    //   mangle: false,
    //   compress: false,
    //   output: {
    //     beautify: true,
    //   },
    // }))
    .pipe(insert.prepend('#!/usr/bin/env node\n\n'))
    .pipe(gulp.dest(buildDir, {
      mode: '0755',
    })));
  merged.push(gulp
    .src('miyoutv-agent/src/servicelist.js')
    .pipe(webpack({
      output: {
        filename: 'servicelist.js',
      },
      target: 'node',
      node: {
        console: false,
        global: false,
        process: false,
        Buffer: false,
        __filename: false,
        __dirname: false,
      },
    }))
    // .pipe(uglify({
    //   mangle: false,
    //   compress: false,
    //   output: {
    //     beautify: true,
    //   },
    // }))
    .pipe(insert.prepend('#!/usr/bin/env node\n\n'))
    .pipe(gulp.dest(path.join(buildDir, 'tools/'), {
      mode: '0755',
    })));
  merged.push(gulp
    .src([
      'miyoutv-agent/tools/chscan.sh',
    ])
    .pipe(gulp.dest(path.join(buildDir, 'tools/'), {
      mode: '0755',
    })));
  eventStream.merge(merged);
});

/**
 * @task {build:agent:resource}
 * @order {3}
 */
gulp.task('build:agent:resource', () => {
  const merged = [];
  const buildDir = path.resolve(
    'build/miyoutv-agent/', packages.miyoutvAgent.buildName
  );
  merged.push(gulp
    .src([
      'miyoutv-agent/package.json',
      'miyoutv-agent/processes.json',
      'miyoutv-agent/config.sample.json',
    ])
    .pipe(gulp.dest(buildDir)));
  merged.push(gulp
    .src([
      'miyoutv-agent/pm2-install.sh',
      'miyoutv-agent/pm2-uninstall.sh',
    ])
    .pipe(gulp.dest(buildDir, {
      mode: '0755',
    })));
  merged.push(gulp
    .src([
      'miyoutv-agent/tools/lists/*.txt',
    ])
    .pipe(gulp.dest(path.join(buildDir, 'tools/lists/'))));
  eventStream.merge(merged);
});
