const path = require('path');
const shelljs = require('shelljs');
const low = require('lowdb');
const router = require('@quanxiaoxiao/router');
const FileSync = require('lowdb/adapters/FileSync');

module.exports = (projects, dbPathName, resourcePath) => {
  if (!shelljs.test('-d', path.dirname(dbPathName))) {
    shelljs.mkdir('-p', path.dirname(dbPathName));
  }
  if (!shelljs.test('-d', resourcePath)) {
    shelljs.mkdir('-p', resourcePath);
  }
  const adapter = new FileSync(dbPathName);

  const db = low(adapter);

  db
    .defaults({
      current: Object.keys(projects).reduce((acc, key) => ({
        ...acc,
        [key]: null,
      }), {}),
      records: [],
    })
    .write();

  const getPages = (pages, name) => Object
    .entries(pages)
    .reduce((acc, [key, getFilePathanme]) => ({
      ...acc,
      [key]: {
        get: {
          file: (ctx) => {
            const currentName = db.get(`current.${name}`).value();
            if (!currentName) {
              ctx.throw(404);
            }
            const pathname = path.join(
              resourcePath,
              currentName,
              getFilePathanme(ctx.matchs),
            );
            ctx.type = path.extname(pathname);
            return pathname;
          },
        },
      },
    }), {});

  const staticApis = Object
    .keys(projects)
    .reduce((acc, name) => {
      const { pages } = projects[name];
      return {
        ...acc,
        ...getPages(pages, name),
      };
    }, {});

  return {
    '/quanresource/(.*)': {
      mount: (ctx, next) => {
        const prefix = ctx.matchs[0].slice(0, ctx.matchs[0].length - ctx.matchs[1].length);

        const name = ctx.get('x-quan-name');
        if (!name) {
          ctx.throw(401);
        }
        const projectItem = projects[name];
        if (!projectItem || projectItem.key !== ctx.get('x-quan-key')) {
          ctx.throw(401);
        }

        ctx.resourcePath = resourcePath;
        ctx.db = db;
        ctx.resourceName = name;

        return router({
          [`${prefix}resources`]: {
            get: {
              body: require('./apis/list'),
            },
          },
          [`${prefix}resource`]: {
            get: {
              body: require('./apis/current'),
            },
            post: {
              body: require('./apis/upload'),
            },
          },
          [`${prefix}resource/prev`]: {
            put: {
              body: require('./apis/prev'),
            },
          },
          [`${prefix}resource/last`]: {
            put: {
              body: require('./apis/last'),
            },
          },
          [`${prefix}resource/:id`]: {
            put: {
              body: require('./apis/update'),
            },
          },
        })(ctx, next);
      },
    },
    ...staticApis,
  };
};
