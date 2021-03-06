// / <reference path="typings/main.d.ts" />
'use strict'
const os = require('os')
const async = require('async')
const fs = require('fs')
const path = require('path')
const configEvent = require('./src/interfaces/Config')
const log = require('./src/utilities/log')
const packageJson = require('./package.json')

let config = require('./config')

global.version = packageJson.version
global.Promise = require('bluebird')

{
  log.log(`弹幕服务器版本：${global.version}`)
  log.log(`环境：${os.platform()}(${os.release()}) ${os.arch()} with ${parseInt(os.totalmem() / 1024 / 1024)}MB`)

  let dbPos = config.database
  if (process.env.MYSQL_PORT_3306_TCP_PORT) { // 检测DaoCloud的MySQL服务
    dbPos.type = 'mysql'
    dbPos.server = process.env.MYSQL_PORT_3306_TCP_ADDR
    dbPos.username = process.env.MYSQL_USERNAME
    dbPos.password = process.env.MYSQL_PASSWORD
    dbPos.port = process.env.MYSQL_PORT_3306_TCP_PORT
    dbPos.db = process.env.MYSQL_INSTANCE_NAME
    console.log('检测到配置在环境变量内的MySQL，自动使用之。')
  } else if (dbPos.type === 'mongo' && process.env['27017/tcp']) { // MongoDB服务
    dbPos.type = 'mongo'
    dbPos.server = process.env['27017/tcp'].split(':')[0].trim() // tcp://xx.xx.xx.xx:27017
    dbPos.port = process.env['27017/tcp'].split(':')[1].trim() // tcp://xx.xx.xx.xx:27017
    dbPos.username = process.env.USERNAME
    dbPos.password = process.env.PASSWORD
    dbPos.db = process.env.INSTANCE_NAME
    console.log('检测到配置在环境变量内的MongoDB，自动使用之。')
  }

// 加载模块
  async.map(['extensions', 'libraries/cache', 'libraries/transfer', 'libraries/database', 'libraries/http', 'libraries/socket'], (mdl, callback) => {
    require(`./src/${mdl}`).init(callback)
  }, err => {
    if (err) throw err
    fs.readdir(path.join(__dirname, './src/controllers'), (err, files) => {
      err // eat it
      files.forEach((filename) => require(path.join(__dirname, './src/controllers', filename)))
    })
    configEvent.updated.emit()
    log.log('服务器初始化完成')
  })
}
