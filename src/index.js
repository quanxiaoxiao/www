const path = require('path');
const shelljs = require('shelljs');
const fs = require('fs');
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
          body: (ctx) => {
            const currentName = db.get(`current.${name}`).value();
            if (!currentName) {
              ctx.throw(404);
            }
            const recordItem = db.get('records')
              .find({
                _id: currentName,
              }).value();
            if (!recordItem || _.isEmpty(recordItem.list)) {
              ctx.throw(404);
            }
            const resourcePathname = getFilePathanme(ctx.matchs);

            const resourceItem = recordItem.list.find((item) => item.path === resourcePathname);
            if (!resourceItem) {
              ctx.throw(404);
            }
            if (ctx.get('if-none-match') === resourceItem.hash) {
              ctx.status = 304;
              return null;
            }
            const pathname = path.join(
              resourcePath,
              currentName,
              resourceItem.path,
            );
            ctx.type = path.extname(pathname);
            ctx.set('etag', resourceItem.hash);
            return fs.createReadStream(pathname);
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
