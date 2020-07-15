const path = require('path');
const shelljs = require('shelljs');
const _ = require('lodash');
const low = require('lowdb');
const router = require('@quanxiaoxiao/router');
const FileSync = require('lowdb/adapters/FileSync');

module.exports = (projects, {
  dbPathName,
  resourcePath,
  prefix,
  logger,
  getResourceName,
}) => {
  if (!_.isFunction(getResourceName)) {
    throw new Error('getResourceName not is function');
  }
  if (prefix == null || prefix === '') {
    prefix = '/';
  }
  if (prefix !== '/' && !/^\/\w+\/?(\/\w+\/?)*$/.test(prefix)) {
    throw new Error('prefix is not set or invliad');
  }
  prefix = prefix.replace(/\/$/, '');
  if (logger && logger.info) {
    logger.info(`set www prefix: \`${prefix}\``);
  }
  if (!shelljs.test('-d', path.dirname(dbPathName))) {
    shelljs.mkdir('-p', path.dirname(dbPathName));
    if (logger && logger.info) {
      logger.info(`set www db path \`${path.dirname(dbPathName)}\``);
    }
  }
  if (!shelljs.test('-d', resourcePath)) {
    shelljs.mkdir('-p', resourcePath);
    if (logger && logger.info) {
      logger.info(`set www dist path \`${resourcePath}\``);
    }
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
    [`${prefix}/(.*)`]: (ctx, next) => {
      const resourceName = getResourceName(ctx);
      if (!resourceName) {
        ctx.throw(401);
      }
      const projectItem = projects[resourceName];
      if (!projectItem) {
        ctx.throw(401);
      }

      ctx.resourcePath = resourcePath;
      ctx.db = db;
      ctx.resourceName = resourceName;

      return router({
        [`${prefix}/resources`]: {
          get: {
            body: require('./apis/list'),
          },
        },
        [`${prefix}/resource`]: {
          get: {
            body: require('./apis/current'),
          },
          post: {
            body: require('./apis/upload'),
          },
        },
        [`${prefix}/resource/prev`]: {
          put: {
            body: require('./apis/prev'),
          },
        },
        [`${prefix}/resource/last`]: {
          put: {
            body: require('./apis/last'),
          },
        },
        [`${prefix}/resource/:id`]: {
          put: {
            body: require('./apis/update'),
          },
        },
        [`${prefix}/pack/:id?`]: {
          get: {
            body: require('./apis/pack'),
          },
        },
      })(ctx, next);
    },
    ...staticApis,
  };
};
