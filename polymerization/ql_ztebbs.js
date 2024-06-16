/*
    name: "中兴社区"
    cron: 10 30 16 * * *
    脚本兼容: 金山文档， 青龙
    更新时间：20240616
*/

let sheetNameSubConfig = "ztebbs"; // 分配置表名称
let pushHeader = "【中兴社区】";
let sheetNameConfig = "CONFIG"; // 总配置表
let sheetNamePush = "PUSH"; // 推送表名称
let sheetNameEmail = "EMAIL"; // 邮箱表
let flagSubConfig = 0; // 激活分配置工作表标志
let flagConfig = 0; // 激活主配置工作表标志
let flagPush = 0; // 激活推送工作表标志
let line = 21; // 指定读取从第2行到第line行的内容
var message = ""; // 待发送的消息
var messageArray = [];  // 待发送的消息数据，每个元素都是某个账号的消息。目的是将不同用户消息分离，方便个性化消息配置
var messageOnlyError = 0; // 0为只推送失败消息，1则为推送成功消息。
var messageNickname = 0; // 1为推送位置标识（昵称/单元格Ax（昵称为空时）），0为不推送位置标识
var messageHeader = []; // 存放每个消息的头部，如：单元格A3。目的是分离附加消息和执行结果消息
var messagePushHeader = pushHeader; // 存放在总消息的头部，默认是pushHeader,如：【xxxx】
var jsonPush = [
  { name: "bark", key: "xxxxxx", flag: "0" },
  { name: "pushplus", key: "xxxxxx", flag: "0" },
  { name: "ServerChan", key: "xxxxxx", flag: "0" },
  { name: "email", key: "xxxxxx", flag: "0" },
  { name: "dingtalk", key: "xxxxxx", flag: "0" },
  { name: "discord", key: "xxxxxx", flag: "0" },
]; // 推送数据，flag=1则推送
var jsonEmail = {
  server: "",
  port: "",
  sender: "",
  authorizationCode: "",
}; // 有效邮箱配置

// =================青龙适配开始===================
// v2.0.0
// 适配青龙转换代码
// cookie内容填写位置
var userContent = [
  ['cookie(默认20个)', '是否执行(是/否)', '账号名称(可不填写)'],
//   ["", "否", "昵称1", "xxx1"],
//   ["", "是", "昵称2", "xxx1"],
]

// CONFIG表内容
// 推送昵称(推送位置标识)选项：若“是”则推送“账户名称”，若账户名称为空则推送“单元格Ax”，这两种统称为位置标识。若“否”，则不推送位置标识
var configContent = [
  ['工作表的名称', '备注', '只推送失败消息（是/否）', '推送昵称（是/否）'],
  [sheetNameSubConfig, pushHeader, '否', '是'],
]

var qlpushFlag = 0  // 推送标识
var qlSheet = []  // 存储当前表的内容
var colNum = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q']

qlConfig = {
  "CONFIG" : configContent,
  "SUBCONFIG" : userContent,
}

var posHttp = 0 // 请求坐标，请求逻辑控制参数，用于记录是第几个请求。控制递归次数，使得异步执行看起来像同步执行，调用多次请求时候需要
var flagFinish = 0  // 签到结束标识，1为结束
var flagResultFinish = 0    // 请求是否结束标识，1为结束

// 覆写
// 发送请求
var HTTPOverwrite = {
    get: function get(url, headers){
        headers = headers["headers"]
        let pos = userContent.length - qlpushFlag  // 计算用户坐标
        // let flagJson = 1    // 判断响应是否为json。1为json
        method = "get"
        resp = fetch(url, {
            method: method,
            headers: headers,
        })
        .then(function(response) {
            // 首先读取文本内容
            return response.text().then(text => {
                // 然后返回包含文本和状态的对象，并保留响应对象以便后续可能需要
                return {
                    status: response.status,
                    text: text, // 文本内容
                    response: response, // 保留响应对象
                    pos: pos // 用户坐标
                };
            });
        })
        .then(function(result) {
            // 尝试将文本内容解析为JSON
            try {
                data = JSON.parse(result.text);
                return {
                    status: result.status,
                    json: function json(){return data;}, // 解析后的JSON数据
                    text: function text(){return result.text;}, // 原始文本内容
                    pos: result.pos // 用户坐标
                };
            } catch (e) {
                // 如果文本内容不是有效的JSON，则返回一个错误或者保留原始文本
                // console.error('Error parsing JSON:', e);
                return {
                    status: result.status,
                    json: null, // 或者你可以返回一个特定的错误对象
                    text: function text(){return result.text;}, // 原始文本内容
                    pos: result.pos // 用户坐标
                };
            }
        })
        .then(result => {
            // 青龙推送标识
            pos = result.pos
            flagResultFinish = resultHandle(result, pos)   // 若在resultHandle中又请求则会继续递归执行，执行完才会发出推送

            
            // 用于判断是否执行下一个用户
            if(flagResultFinish == 1){    // 判断是否当前用户的所有请求都结束
                i = pos + 1 // pos是当前用户，+1是执行下一个用户
               for (; i <= line; i++) {
                    var cookie = Application.Range("A" + i).Text;
                    var exec = Application.Range("B" + i).Text;
                    if (cookie == "") {
                        // 如果为空行，则提前结束读取
                        break;
                    }
                    if (exec == "是") {
                        console.log("开始执行用户：" + i)
                        flagResultFinish = 0    // 置空，在要运行前置空
                        execHandle(cookie, i);
                        break;  // 只取一个
                    }
                } 
            }
            if(pos == userContent.length && flagResultFinish == 1){    // 判断是否所有请求都结束
                flagFinish = 1
            }

            if(qlpushFlag == 0 && flagFinish == 1){  // 最后才推送
                console.log("青龙发起推送")
                message = messageMerge()// 将消息数组融合为一条总消息
                // push(message); // 推送消息
                const { sendNotify } = require('./sendNotify.js'); // commonjs
                sendNotify(pushHeader, message);
                qlpushFlag = -100 // 不用再发起推送了
            }
        })
        .catch(error => {
            // 捕获并处理在请求或处理响应过程中发生的任何错误
            console.error('Fetch error:', error);
        });
    },

    post: function post(url, data, headers, option){
    headers = headers["headers"]
    contentType = headers["Content-Type"]
    contentType2 = headers["content-type"]
    // var jsonData = JSON.stringify(data);
    // console.log(data)
    var jsonData = ""
    if((contentType != undefined && contentType != "") || (contentType2 != undefined && contentType2 != "")){
        if(contentType == "application/x-www-form-urlencoded"){
            console.log("检测到请求为表单格式，发送表单请求")
            jsonData = dataToFormdata(data)
        }else{
            try{
                // json格式
                console.log("json格式data")
                jsonData = JSON.stringify(data);
            }catch{
                console.log("非json，非表单data")
                jsonData = data
            }
        }
    }else{
        console.log("json格式data")
        jsonData = JSON.stringify(data);
    }
    
    // console.log(headers)
    // console.log(jsonData)
    if(option == "get" || option == "GET"){
        let pos = userContent.length - qlpushFlag  // 计算用户坐标
        method = "get"
        resp = fetch(url, {
            method: method,
            headers: headers,
            // body: jsonData
        })
        .then(function(response) {
            // 首先读取文本内容
            return response.text().then(text => {
                // 然后返回包含文本和状态的对象，并保留响应对象以便后续可能需要
                return {
                    status: response.status,
                    text: text, // 文本内容
                    response: response, // 保留响应对象
                    pos: pos // 用户坐标
                };
            });
        })
        .then(function(result) {
            // 尝试将文本内容解析为JSON
            try {
                data = JSON.parse(result.text);
                return {
                    status: result.status,
                    json: function json(){return data;}, // 解析后的JSON数据
                    text: function text(){return result.text;}, // 原始文本内容
                    pos: result.pos // 用户坐标
                };
            } catch (e) {
                // 如果文本内容不是有效的JSON，则返回一个错误或者保留原始文本
                // console.error('Error parsing JSON:', e);
                return {
                    status: result.status,
                    json: null, // 或者你可以返回一个特定的错误对象
                    text: function text(){return result.text;}, // 原始文本内容
                    pos: result.pos // 用户坐标
                };
            }
        })
        .then(result => {
            // 青龙推送标识
            pos = result.pos
            flagResultFinish = resultHandle(result, pos)   // 若在resultHandle中又请求则会继续递归执行，执行完才会发出推送
            // 用于判断是否执行下一个用户
            if(flagResultFinish == 1){    // 判断是否当前用户的所有请求都结束
                i = pos + 1 // pos是当前用户，+1是执行下一个用户
                
               for (; i <= line; i++) {
                    var cookie = Application.Range("A" + i).Text;
                    var exec = Application.Range("B" + i).Text;
                    if (cookie == "") {
                        // 如果为空行，则提前结束读取
                        break;
                    }
                    if (exec == "是") {
                        console.log("开始执行用户：" + i)
                        flagResultFinish = 0    // 置空，在要运行前置空
                        execHandle(cookie, i);
                        break;  // 只取一个
                    }
                } 
                
            }
            // 用于推送
            if(pos == userContent.length && flagResultFinish == 1){    // 判断是否所有请求都结束
                flagFinish = 1
            }

            if(qlpushFlag == 0 && flagFinish == 1){  // 最后才推送
                console.log("青龙发起推送")
                message = messageMerge()// 将消息数组融合为一条总消息
                // push(message); // 推送消息
                const { sendNotify } = require('./sendNotify.js'); // commonjs
                sendNotify(pushHeader, message);
                qlpushFlag = -100 // 不用再发起推送了
            }
        })
        .catch(error => {
            // 捕获并处理在请求或处理响应过程中发生的任何错误
            console.error('Fetch error:', error);
        });
    }else{
        // 青龙推送标识
        let pos = userContent.length - qlpushFlag  // 计算用户坐标
        // console.log("推送：" + pos)
        method = "post"
        resp = fetch(url, {
            method: method,
            headers: headers,
            body: jsonData
        })
        .then(function(response) {
            // 首先读取文本内容
            return response.text().then(text => {
                // 然后返回包含文本和状态的对象，并保留响应对象以便后续可能需要
                return {
                    status: response.status,
                    text: text, // 文本内容
                    response: response, // 保留响应对象
                    pos: pos // 用户坐标
                };
            });
        })
        .then(function(result) {
            // 尝试将文本内容解析为JSON
            try {
                data = JSON.parse(result.text);
                return {
                    status: result.status,
                    json: function json(){return data;}, // 解析后的JSON数据
                    text: function text(){return result.text;}, // 原始文本内容
                    pos: result.pos // 用户坐标
                };
            } catch (e) {
                // 如果文本内容不是有效的JSON，则返回一个错误或者保留原始文本
                // console.error('Error parsing JSON:', e);
                return {
                    status: result.status,
                    json: null, // 或者你可以返回一个特定的错误对象
                    text: function text(){return result.text;}, // 原始文本内容
                    pos: result.pos // 用户坐标
                };
            }
        })
        .then(result => {
            // console.log(result)
            pos = result.pos
            flagResultFinish = resultHandle(result, pos)   // 若在resultHandle中又请求则会继续递归执行，执行完才会发出推送

            // 用于判断是否执行下一个用户
            if(flagResultFinish == 1){    // 判断是否当前用户的所有请求都结束
                i = pos + 1 // pos是当前用户，+1是执行下一个用户
               for (; i <= line; i++) {
                    var cookie = Application.Range("A" + i).Text;
                    var exec = Application.Range("B" + i).Text;
                    if (cookie == "") {
                        // 如果为空行，则提前结束读取
                        break;
                    }
                    if (exec == "是") {
                        console.log("开始执行用户：" + i)
                        flagResultFinish = 0    // 置空，在要运行前置空
                        execHandle(cookie, i);
                        break;  // 只取一个
                    }
                } 
            }

            // 用于推送
            if(pos == userContent.length && flagResultFinish == 1){    // 判断是否所有用户的所有请求都结束
                flagFinish = 1
            }

            if(qlpushFlag == 0 && flagFinish == 1){  // 最后才推送
                console.log("青龙发起推送")
                let message = messageMerge()// 将消息数组融合为一条总消息
                // push(message); // 推送消息
                const { sendNotify } = require('./sendNotify.js'); // commonjs
                sendNotify(pushHeader, message);
                qlpushFlag = -100 // 不用再发起推送了
            }
        })
        .catch(error => {
            // 捕获并处理在请求或处理响应过程中发生的任何错误
            console.error('Fetch error:', error);
        });
    }
  }
};

// 覆写
var ApplicationOverwrite = {
    Range: function Range(pos){
        // 解析位置
        charFirst = pos.substring(0, 1);  // 列
        qlRow = pos.substring(1, pos.length);  // 行
        // qlSheet存储当前表，直接处理此数组
        // 将字母转成对应列
        qlCol = 1
        for(num in colNum){
        if(colNum[num] == charFirst){
            break;
        }
        qlCol += 1
        }
        // console.log(qlRow + "-" + qlCol)
        try{  // 超出范围则认为为空
        result = qlSheet[qlRow - 1][qlCol - 1]
        }catch{
        result = ""
        }
        dict = { Text: result }
        return dict;
    },

    Sheets: {
        Item: function(sheetName) {
            // console.log(sheetName)
            // 返回一个模拟的Sheet对象
            return {
                Name: sheetName,
                // Name: sheetName,
                // Data: sheetsData[sheetName] || null, // 如果找不到对应的sheet，返回null
                Activate: function() {
                    flag = 1
                    qlSheet = qlConfig[sheetName]
                    if(qlSheet == undefined){ // 读取不到表，则认为是分配置表
                        qlSheet = qlConfig["SUBCONFIG"]
                    }
                    console.log("青龙激活工作表：" + sheetName);
                    return flag

                }
            };
        }
    },
};

// 覆写
// md5加密
var CryptoOverwrite = {
    createHash : function createHash(method){
        // console.log("加密算法：" + method)
            return {
                update : function update(data, code){
                    // console.log("数据" + data)
                    // console.log("编码" + code)
                    return {
                        digest : function digest(format){
                            // console.log("数据" + data)
                            // console.log("数据格式" + format)
                            return{
                                toUpperCase : function toUpperCase(){
                                    // console.log("转大写" )
                                    return{
                                        toString : function toString(){
                                            // console.log("转字符串" )
                                            // 引入模块
                                            let CryptoJS = require("crypto-js");
                                            let md5Hash = CryptoJS.MD5(data).toString();
                                            // 转大写
                                            md5Hash = md5Hash.toUpperCase()
                                            console.log(md5Hash);
                                            return md5Hash
                                        }
                                    }
                                },
                                toString : function toString(){
                                    // console.log("转字符串" )
                                    // 引入模块
                                    const CryptoJS = require("crypto-js");
                                    const md5Hash = CryptoJS.MD5(data).toString();
                                    console.log(md5Hash);
                                    return md5Hash
                                }
                            }
                        }
                    }
                }
            }
    }
}

// json格式装表单
function dataToFormdata(jsonObj){
//   console.log(jsonObj)
  // "xxx=xxx&xxx=xxx"
  result = ""
  values = Object.values(jsonObj);

  values.forEach((value, index) => {
      key = Object.keys(jsonObj)[index]; // 获取对应的键
      // if(value == "[object Object]")
      // {
      //   value = "{}"
      // }
      // console.log(key + ": " + value);
      content = key + "=" + value + "&"
      result += content 
  });

  result = result.substring(0, result.length - 1);
  console.log(result)
  return result
}

// 用户数据适配
// 以#风格单用户cookie，解离出所需变量
function cookiesTocookieMin(cookie) {
  let cookie_text = cookie;
  let arr = [];
  var text_to_split = cookie_text.split("#");
  for (let i in text_to_split) {
    arr[i] = text_to_split[i]
  }
  return arr
}

// 以@分割cookies变为单个cookie
function cookiesTocookie(cookies) {
  let cookie_text = cookies;
  let arr = [];
  let temparr = []
  let text_to_split = cookie_text.split("@");
  for (let i in text_to_split) {
      temparr = []
    let pos = Number(i) + 1
    // 解离细微cookie
    arr = cookiesTocookieMin(text_to_split[i])
    // console.log(arr)
    temparr.push(arr[0])
    temparr.push("是")
    temparr.push("昵称" + pos)
    if(arr.length > 0){    // 存在细微cookie
        for (let j=3; j < arr.length + 2; j++){
            temparr.push(arr[j - 2])
        }
    }
    // console.log(temparr)
    userContent.push(temparr)
  }
  qlpushFlag = userContent.length - 1
//   console.log(userContent)
}

var qlSwitch = 0;   // 默认金山文档
// 自动检测是否是青龙环境
try{
    // 青龙环境
    qlSwitch = process.env[sheetNameSubConfig]
    qlSwitch = 1 // 是否青龙环境，1则是青龙，0则是金山文档
    console.log("【+】当前环境为青龙")
      console.log("【+】 开始适配青龙环境，执行青龙代码")
    // 模块引用
    //   var axios = require('axios');
    try{
        // 模块适配，部分用户无fetch报错，因此进行引入
        fetch = require('node-fetch');
        console.log("【+】系统无fetch，已进行node-fetch引入")
    }catch{
        console.log("【+】系统已有原生fetch")
    }
    
    // 用户数据适配
    cookies = process.env[sheetNameSubConfig]
    //   console.log(cookies)
    cookiesTocookie(cookies)
    // 函数适配
    Application = ApplicationOverwrite
    Crypto = CryptoOverwrite
    HTTP = HTTPOverwrite

}catch{
  qlSwitch = 0
  console.log("【+】当前环境为金山文档")
  console.log("【+】 开始适配金山文档，执行金山文档代码")
}


// =================青龙适配结束===================

// =================金山适配开始===================
// 总推送
function push(message) {
  if (message != "") {
    message = messagePushHeader + message // 消息头最前方默认存放：【xxxx】
    let length = jsonPush.length;
    let name;
    let key;
    for (let i = 0; i < length; i++) {
      if (jsonPush[i].flag == 1) {
        name = jsonPush[i].name;
        key = jsonPush[i].key;
        if (name == "bark") {
          bark(message, key);
        } else if (name == "pushplus") {
          pushplus(message, key);
        } else if (name == "ServerChan") {
          serverchan(message, key);
        } else if (name == "email") {
          email(message);
        } else if (name == "dingtalk") {
          dingtalk(message, key);
        } else if (name == "discord") {
          discord(message, key);
        }
      }
    }
  } else {
    console.log("消息为空不推送");
  }
}


// 推送bark消息
function bark(message, key) {
  if (key != "") {
    let url = "https://api.day.app/" + key + "/" + message;
    // 若需要修改推送的分组，则将上面一行改为如下的形式
    // let url = 'https://api.day.app/' + bark_id + "/" + message + "?group=分组名";
    let resp = HTTP.get(url, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    sleep(5000);
  }
}

// 推送pushplus消息
function pushplus(message, key) {
  if (key != "") {
    // url = "http://www.pushplus.plus/send?token=" + key + "&content=" + message;
    url = "http://www.pushplus.plus/send?token=" + key + "&content=" + message + "&title=" + pushHeader;  // 增加标题
    let resp = HTTP.fetch(url, {
      method: "get",
    });
    sleep(5000);
  }
}

// 推送serverchan消息
function serverchan(message, key) {
  if (key != "") {
    url =
      "https://sctapi.ftqq.com/" +
      key +
      ".send" +
      "?title=消息推送" +
      "&desp=" +
      message;
    let resp = HTTP.fetch(url, {
      method: "get",
    });
    sleep(5000);
  }
}

// email邮箱推送
function email(message) {
  var myDate = new Date(); // 创建一个表示当前时间的 Date 对象
  var data_time = myDate.toLocaleDateString(); // 获取当前日期的字符串表示
  let server = jsonEmail.server;
  let port = parseInt(jsonEmail.port); // 转成整形
  let sender = jsonEmail.sender;
  let authorizationCode = jsonEmail.authorizationCode;

  let mailer;
  mailer = SMTP.login({
    host: server,
    port: port,
    username: sender,
    password: authorizationCode,
    secure: true,
  });
  mailer.send({
    from: pushHeader + "<" + sender + ">",
    to: sender,
    subject: pushHeader + " - " + data_time,
    text: message,
  });
  // console.log("已发送邮件至：" + sender);
  console.log("已发送邮件");
  sleep(5000);
}

// 邮箱配置
function emailConfig() {
  console.log("开始读取邮箱配置");
  let length = jsonPush.length; // 因为此json数据可无序，因此需要遍历
  let name;
  for (let i = 0; i < length; i++) {
    name = jsonPush[i].name;
    if (name == "email") {
      if (jsonPush[i].flag == 1) {
        let flag = ActivateSheet(sheetNameEmail); // 激活邮箱表
        // 邮箱表存在
        // var email = {
        //   'email':'', 'port':'', 'sender':'', 'authorizationCode':''
        // } // 有效配置
        if (flag == 1) {
          console.log("开始读取邮箱表");
          for (let i = 2; i <= 2; i++) {
            // 从工作表中读取推送数据
            jsonEmail.server = Application.Range("A" + i).Text;
            jsonEmail.port = Application.Range("B" + i).Text;
            jsonEmail.sender = Application.Range("C" + i).Text;
            jsonEmail.authorizationCode = Application.Range("D" + i).Text;
            if (Application.Range("A" + i).Text == "") {
              // 如果为空行，则提前结束读取
              break;
            }
          }
          // console.log(jsonEmail)
        }
        break;
      }
    }
  }
}

// 推送钉钉机器人
function dingtalk(message, key) {
  let url = "https://oapi.dingtalk.com/robot/send?access_token=" + key;
  let resp = HTTP.post(url, { msgtype: "text", text: { content: message } });
  // console.log(resp.text())
  sleep(5000);
}

// 推送Discord机器人
function discord(message, key) {
  let url = key;
  let resp = HTTP.post(url, { content: message });
  //console.log(resp.text())
  sleep(5000);
}

// =================金山适配结束===================

// =================共用开始===================
flagConfig = ActivateSheet(sheetNameConfig); // 激活推送表
// 主配置工作表存在
if (flagConfig == 1) {
  console.log("开始读取主配置表");
  let name; // 名称
  let onlyError;
  let nickname;
  for (let i = 2; i <= 100; i++) {
    // 从工作表中读取推送数据
    name = Application.Range("A" + i).Text;
    onlyError = Application.Range("C" + i).Text;
    nickname = Application.Range("D" + i).Text;
    if (name == "") {
      // 如果为空行，则提前结束读取
      break; // 提前退出，提高效率
    }
    if (name == sheetNameSubConfig) {
      if (onlyError == "是") {
        messageOnlyError = 1;
        console.log("只推送错误消息");
      }

      if (nickname == "是") {
        messageNickname = 1;
        console.log("单元格用昵称替代");
      }

      break; // 提前退出，提高效率
    }
  }
}

flagPush = ActivateSheet(sheetNamePush); // 激活推送表
// 推送工作表存在
if (flagPush == 1) {
  console.log("开始读取推送工作表");
  let pushName; // 推送类型
  let pushKey;
  let pushFlag; // 是否推送标志
  for (let i = 2; i <= line; i++) {
    // 从工作表中读取推送数据
    pushName = Application.Range("A" + i).Text;
    pushKey = Application.Range("B" + i).Text;
    pushFlag = Application.Range("C" + i).Text;
    if (pushName == "") {
      // 如果为空行，则提前结束读取
      break;
    }
    jsonPushHandle(pushName, pushFlag, pushKey);
  }
  // console.log(jsonPush)
}

// 邮箱配置函数
emailConfig();

flagSubConfig = ActivateSheet(sheetNameSubConfig); // 激活分配置表
if (flagSubConfig == 1) {
  console.log("开始读取分配置表");

    if(qlSwitch != 1){  // 金山文档
        for (let i = 2; i <= line; i++) {
            var cookie = Application.Range("A" + i).Text;
            var exec = Application.Range("B" + i).Text;
            if (cookie == "") {
                // 如果为空行，则提前结束读取
                break;
            }
            if (exec == "是") {
                execHandle(cookie, i);
            }
        }   
        message = messageMerge()// 将消息数组融合为一条总消息
        push(message); // 推送消息
    }else{
        for (let i = 2; i <= line; i++) {
            var cookie = Application.Range("A" + i).Text;
            var exec = Application.Range("B" + i).Text;
            if (cookie == "") {
                // 如果为空行，则提前结束读取
                break;
            }
            if (exec == "是") {
                execHandle(cookie, i);
                break;  // 只取一个
            }
        } 
    }

}

// 激活工作表函数
function ActivateSheet(sheetName) {
    let flag = 0;
    try {
      // 激活工作表
      let sheet = Application.Sheets.Item(sheetName);
      sheet.Activate();
      console.log("激活工作表：" + sheet.Name);
      flag = 1;
    } catch {
      flag = 0;
      console.log("无法激活工作表，工作表可能不存在");
    }
    return flag;
}

// 对推送数据进行处理
function jsonPushHandle(pushName, pushFlag, pushKey) {
  let length = jsonPush.length;
  for (let i = 0; i < length; i++) {
    if (jsonPush[i].name == pushName) {
      if (pushFlag == "是") {
        jsonPush[i].flag = 1;
        jsonPush[i].key = pushKey;
      }
    }
  }
}

// 将消息数组融合为一条总消息
function messageMerge(){
    // console.log(messageArray)
    let message = ""
  for(i=0; i<messageArray.length; i++){
    if(messageArray[i] != "" && messageArray[i] != null)
    {
      message += messageHeader[i] + messageArray[i] + " "; // 加上推送头
    }
  }
  if(message != "")
  {
    console.log(message)  // 打印总消息
  }
  return message
}

function sleep(d) {
  for (var t = Date.now(); Date.now() - t <= d; );
}

// 获取sign，返回小写
function getsign(data) {
    var sign = Crypto.createHash("md5")
        .update(data, "utf8")
        .digest("hex")
        // .toUpperCase() // 大写
        .toString();
    return sign;
}

// =================共用结束===================

// 结果处理函数
function resultHandle(resp, pos){
    // 每次进来resultHandle则加一次请求
    posHttp += 1    // 青龙适配，青龙微适配
    
    // let messageSuccess = "";
    // let messageFail = "";
    let messageName = "";
    // 推送昵称或单元格，还是不推送位置标识
    if (messageNickname == 1) {
        // 推送昵称或单元格
        messageName = Application.Range("C" + pos).Text;
        if(messageName == "")
        {
            messageName = "单元格A" + pos + "";
        }
    }
    posLabel = pos-2 ;  // 存放下标，从0开始
    messageHeader[posLabel] = messageName
    // console.log(messageName)


    if (resp.status == 200) {
      resp = resp.json();
      console.log(resp)
      status = resp["status"]
      
      if(status == 200)
      {
        msg = resp["data"]["msg"]
        continueDays = resp["data"]["continueDays"]

        content = msg + " 已签" + continueDays + "天 "
        messageSuccess += content;
        console.log(content)
      }else
      {
        content = "签到失败 "
        messageFail += content;
        console.log(content);
      }
    } else {
      content = "签到失败 "
      messageFail += content;
      console.log(content);
    }

    // 青龙适配，青龙微适配
    flagResultFinish = 1; // 签到结束   
    

  sleep(2000);
  if (messageOnlyError == 1) {
    messageArray[posLabel] = messageFail;
  } else {
    messageArray[posLabel] = messageFail + " " + messageSuccess;
  }

  if(messageArray[posLabel] != "")
  {
    console.log(messageArray[posLabel]);
  }
//   console.log(messageArray)

  return flagResultFinish
}


// 具体的执行函数
function execHandle(cookie, pos) {
    // 清零操作，保证不同用户的消息的独立
    // 青龙适配，青龙微适配
    posHttp = 0 // 置空请求
    qlpushFlag -= 1 // 一个用户只会执行一次execHandle，因此可用于记录当前用户
    messageSuccess = "";
    messageFail = "";

  // try {
    var url1 = "https://api-bbs.ztedevices.com/points/home/pointsRegister"; // 社区签到
    // var url2 = "https://www.ztemall.com/index.php/topapi" // 商城签到
    // ztemallcookie = Application.Range("D" + pos).Text;  // 商城的cookie
    
    // 社区签到
    // {"status":200,"msg":"success","data":{"list":[{"day":"4.30","energy":0,"tab":1},{"day":"5.1","energy":0,"tab":1},{"day":"5.2","energy":0,"tab":1},{"day":"5.3","energy":1,"tab":2},{"day":"5.4","energy":2,"tab":3},{"day":"5.5","energy":3,"tab":3},{"day":"5.6","energy":4,"tab":3}],"msg":"签到成功！经验 +10 流星 +1"","continueDays":1}}
    // {"status":200,"msg":"success","data":{"list":[{"day":"4.30","energy":0,"tab":1},{"day":"5.1","energy":0,"tab":1},{"day":"5.2","energy":0,"tab":1},{"day":"5.3","energy":1,"tab":2},{"day":"5.4","energy":2,"tab":3},{"day":"5.5","energy":3,"tab":3},{"day":"5.6","energy":4,"tab":3}],"msg":"签到成功","continueDays":1}}
    // {"status":400,"msg":"请求数据异常！","data":[]}
    data = {
        "v" : ""
    }

    headers={
      "Accesstoken": cookie, 
      "Content-Type": "application/x-www-form-urlencoded",
      // "Host":"api-bbs.ztedevices.com",
      // "Cookie":""
    }

    resp = HTTP.post(
      url1,
    //   JSON.stringify(data),
    data,
      { headers: headers }
    );



    // // 商城签到
    // params = "?method=member.checkIn.add&format=json&v=v1&sign=&accessToken=token%24%24xxxxx"
    // headers={
    //   "Host": "www.ztemall.com",
    //   "Cookie": ztemallcookie, 
    // }
    // resp = HTTP.fetch(url2 + params, {
    //   method: "get",
    //   headers: headers,
    //   // data: data
    // });

    // // {"errorcode":0,"msg":"","data":{"checkin_days":1,"currentCheckInPoint":"10","point":1010,"status":"success"}}
    // // {"errorcode":"10000","msg":"会员签到记录保存失败","data":{}}
    // // {"errorcode":20001,"msg":"invalid token","data":{}}
    // if (resp.status == 200) {
    //   resp = resp.json();
    //   console.log(resp)
    //   errorcode = resp["errorcode"]
      
    //   if(status == 0)
    //   {
    //     msg = resp["msg"]
    //     checkin_days = resp["data"]["checkin_days"] // 签到天数
    //     currentCheckInPoint = resp["data"]["currentCheckInPoint"] // 获得积分
    //     point = resp["data"]["point"] // 总积分

    //     content = msg + " 已签" + continueDays + "天 "
    //     messageSuccess += content;
    //     console.log(content)
    //   }else
    //   {
    //     content = "签到失败 "
    //     messageFail += content;
    //     console.log(content);
    //   }
    // } else {
    //   content = "签到失败 "
    //   messageFail += content;
    //   console.log(content);
    // }


  // } catch {
  //   messageFail += messageName + "失败";
  // }

    if(qlSwitch != 1){  // 选择金山文档
        resultHandle(resp, pos)
    }
}