/*
name: "鸿星尔克官方会员中心小程序"
cron: 10 30,9 * * *
脚本兼容: 金山文档， 青龙
更新时间：20240610
*/

let sheetNameSubConfig = "hxek"; // 分配置表名称（修改这里，这里填表的名称，需要和UPDATE文件中的一致，自定义的）
let pushHeader = "【鸿星尔克】";    //（修改这里，这里给自己看的，随便填）
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
// 自动检测是否是青龙环境
try{
    // 青龙环境
    qlSwitch = process.env[sheetNameSubConfig]
    qlSwitch = 1 // 是否青龙环境，1则是青龙，0则是金山文档
    console.log("【+】当前环境为青龙")
}catch{
  qlSwitch = 0
  console.log("【+】当前环境为金山文档")
}
// 适配青龙转换代码
// cookie内容填写位置
var userContent = [
  ['cookie(默认20个)', '是否执行(是/否)', '账号名称(可不填写)', 'memberId', 'enterpriseId'],
//   ["", "否", "昵称1", "xxx1", "xxx2"],
//   ["", "是", "昵称2", "xxx1", "xxx2"],
]

// CONFIG表内容
// 推送昵称(推送位置标识)选项：若“是”则推送“账户名称”，若账户名称为空则推送“单元格Ax”，这两种统称为位置标识。若“否”，则不推送位置标识
var configContent = [
  ['工作表的名称', '备注', '只推送失败消息（是/否）', '推送昵称（是/否）'],
  [sheetNameSubConfig, pushHeader, '否', '是'],
]

// PUSH表内容 		
var pushContent = [
  ['推送类型', '推送识别号(如：token、key)', '是否推送（是/否）'],
  ['bark', 'xxxxxxxx', '否'],
  ['pushplus', 'xxxxxxxx', '否'],
  ['ServerChan', 'xxxxxxxx', '否'],
  ['email', '若要邮箱发送，请配置EMAIL表', '否'],
  ['dingtalk', 'xxxxxxxx', '否'],
  ['discord', '请填入镜像webhook链接,自行处理Query参数', '否'],
]

// email表内容
var emailContent = [
  ['SMTP服务器域名', '端口', '发送邮箱', '授权码'],
  ['smtp.qq.com', '465', 'xxxxxxxx@qq.com', 'xxxxxxxx']
]

var qlpushFlag = 0  // 推送标识
var qlSheet = []  // 存储当前表的内容
var colNum = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q']

qlConfig = {
  "CONFIG" : configContent,
  "PUSH"   : pushContent,
  "EMAIL"  : emailContent,
  "SUBCONFIG" : userContent,
}

var ApplicationCustom = {
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
  }
};

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
  // console.log(result)
  return result
}
// 发送请求
var SendReq = {
    get: function get(url, headers){
        headers = headers["headers"]
        resp = fetch(url, {
            method: 'get',
            headers: headers,
            timeout: 30000 // 超时时间设置为30秒
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            console.log(data);
        });
    },
  post: function post(url, data, headers){
    headers = headers["headers"]
    contentType = headers["Content-Type"]
    contentType2 = headers["content-type"]
    // var jsonData = JSON.stringify(data);
    if((contentType != undefined && contentType != "") || (contentType2 != undefined && contentType2 != "")){
        if(contentType == "application/x-www-form-urlencoded"){
            console.log("检测到请求为表单格式，发送表单请求")
            jsonData = dataToFormdata(data)
        }
    }else{
        // json格式
        jsonData = JSON.stringify(data);
    }
    
    // console.log(headers)
    // console.log(jsonData)
    resp = fetch(url, {
        method: 'post',
        headers: headers,
        body: jsonData
    })

    .then(function(response) {
        // return response.json();
          return {
            status: response.status,
            json: response.json() // 注意这里返回的是一个 Promise
        };
    })
    .then(function(result) {
        return result.json.then(data => {
            return { status: result.status, json: function json(){return data;} }; // 返回一个新的对象
        });
    })
    .then(result => {
        // 青龙推送标识
        qlpushFlag -= 1
        pos = userContent.length - qlpushFlag  // 计算用户坐标
        resultHandle(result, pos)

        if(qlpushFlag == 0){  // 最后才推送
            console.log("青龙发起推送")
            message = messageMerge()// 将消息数组融合为一条总消息
            push(message); // 推送消息
        }
    })
    .catch(error => {
        // 捕获并处理在请求或处理响应过程中发生的任何错误
        console.error('Fetch error:', error);
    });

  }
};
    

if(qlSwitch == 1){  // 选择青龙
  console.log("【+】 开始适配青龙环境，执行青龙代码")
  // 模块引用
  var axios = require('axios');
  // 用户数据适配
  cookies = process.env[sheetNameSubConfig]
//   console.log(cookies)
  cookiesTocookie(cookies)
  // 推送数据适配
    adaptPush() // 推送适配
  // 函数适配
  Application = ApplicationCustom
  HTTP = SendReq

}else{  // 金山文档
  console.log("【+】 开始适配金山文档，执行金山文档代码")
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
    let pos = Number(i) + 1
    // 解离细微cookie
    arr = cookiesTocookieMin(text_to_split[i])
    if(arr.length != 0){    // 存在细微cookie
        temparr.push(arr[0])
        temparr.push("是")
        temparr.push("昵称" + pos)
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

function extractBark(url) {
  const regex = /https:\/\/api\.day\.app\/(\w+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
}

// 推送适配
function adaptPush(){
    // bark
    BARK_PUSH = process.env["BARK_PUSH"] 
    if (BARK_PUSH.startsWith('http')) {
        BARK_PUSH = extractBark(BARK_PUSH);// `https://api.day.app/xxx`; -> xxx
    }
    if(BARK_PUSH != "" && BARK_PUSH != undefined ){
        pushContent[1][1] = BARK_PUSH;
        pushContent[1][2] = "是";
    }

    // pushplus
    PUSH_PLUS_TOKEN = process.env["PUSH_PLUS_TOKEN"] 
    if(PUSH_PLUS_TOKEN != "" && PUSH_PLUS_TOKEN != undefined  ){
        pushContent[2][1] = PUSH_PLUS_TOKEN;
        pushContent[2][2] = "是";
    }

    // ServerChan
    PUSH_KEY = process.env["PUSH_KEY"] 
    if(PUSH_KEY != "" && PUSH_KEY != undefined ){
        pushContent[3][1] = PUSH_KEY;
        pushContent[3][2] = "是";
    }

    // email
    SMTP_SERVER = process.env["SMTP_SERVER"]
    SMTP_PORT = process.env["SMTP_PORT"]
    SMTP_EMAIL = process.env["SMTP_EMAIL"] 
    SMTP_PASSWORD = process.env["SMTP_PASSWORD"] 
    // SMTP_NAME = process.env["SMTP_NAME"] 
    if(PUSH_KEY != "" ){
        pushContent[4][2] = "是";
        emailContent[1][0] = SMTP_SERVER;   // SMTP服务器域名
        if(SMTP_PORT == "" || SMTP_PORT == undefined || SMTP_PORT == "undefined" ){    // 如果端口为空
            SMTP_PORT   = 465
        }
        emailContent[1][1] = SMTP_PORT;     // 端口 
        emailContent[1][2] = SMTP_EMAIL;    // 发送邮箱
        emailContent[1][3] = SMTP_PASSWORD; // 授权码
    }

    // dingtalk
    DD_BOT_SECRET = process.env["DD_BOT_SECRET"]
    DD_BOT_TOKEN  = process.env["DD_BOT_TOKEN"]
    if(DD_BOT_SECRET != "" && DD_BOT_SECRET != undefined ){
        pushContent[5][1] = DD_BOT_SECRET;
        pushContent[5][2] = "是";
    }
    if(DD_BOT_TOKEN != "" && DD_BOT_TOKEN != undefined ){    // 以access_token优先
        pushContent[5][1] = DD_BOT_TOKEN;
        pushContent[5][2] = "是";
    }

    // discord
    DISCORD_WEBHOOK = process.env["DISCORD_WEBHOOK"]
    if(DISCORD_WEBHOOK != "" && DISCORD_WEBHOOK != undefined ){    // 以access_token优先
        pushContent[6][1] = DISCORD_WEBHOOK;
        pushContent[6][2] = "是";
    }
}

// 功能函数适配
// 激活工作表函数
function ActivateSheet(sheetName) {
  if(qlSwitch != 1){  // 金山文档
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
  }else{  // 青龙 qlSwitch == 1
    flag = 1
    qlSheet = qlConfig[sheetName]
    if(qlSheet == undefined){ // 读取不到表，则认为是分配置表
      qlSheet = qlConfig["SUBCONFIG"]
    }
    // console.log(qlSheet)
    console.log("青龙激活工作表：" + sheetName);
    return flag
  }
}

// 获取sign，返回小写
function getsign(data) {
    if(qlSwitch != 1){  // 金山文档
        var sign = Crypto.createHash("md5")
            .update(data, "utf8")
            .digest("hex")
            // .toUpperCase() // 大写
            .toString();
        return sign;
    }else{  // 青龙
        const CryptoJS = require("crypto-js");
        const md5Hash = CryptoJS.MD5(data).toString();
        console.log(md5Hash);
        return md5Hash
    }
}

// 推送函数适配
// 推送bark消息
function bark(message, key) {
    console.log("执行bark")
  if (key != "") {
    let url = "https://api.day.app/" + key + "/" + message;
    // 若需要修改推送的分组，则将上面一行改为如下的形式
    // let url = 'https://api.day.app/' + bark_id + "/" + message + "?group=分组名";
    headers = { "Content-Type": "application/x-www-form-urlencoded" }
    let resp = HTTP.get(url, {
        headers: headers,
    });
  }
}


// 推送pushplus消息
function pushplus(message, key) {
    console.log("执行pushplus")
  if (key != "") {
    // url = "http://www.pushplus.plus/send?token=" + key + "&content=" + message;
    url = "http://www.pushplus.plus/send?token=" + key + "&content=" + message + "&title=" + pushHeader;  // 增加标题
    if(qlSwitch != 1){ // 金山文档
        let resp = HTTP.fetch(url, {
            method: "get",
        });
    }
    else{   // 青龙
        headers= {'Content-Type': 'application/json'}
        let resp = fetch(url, {
            method: 'get',
            headers: headers,
            // body: jsonData
            timeout: 30000 // 超时时间设置为30秒
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            console.log(data);
        });

    }
  }
}

// 推送serverchan消息
function serverchan(message, key) {
    console.log("执行serverchan")
  if (key != "") {
    url =
      "https://sctapi.ftqq.com/" +
      key +
      ".send" +
      "?title=消息推送" +
      "&desp=" +
      message; 
    if(qlSwitch != 1){  // 金山文档  
        let resp = HTTP.fetch(url, {
            method: "get",
        });
    }
    else{
        // 青龙
        console.log(url)
        headers= {'Content-Type': 'application/json'}
        resp = fetch(url, {
            method: 'get',
            headers: headers,
            // body: jsonData
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            console.log(data);
        });

    }
  }
}

// email邮箱推送
function email(message) {
    console.log("执行email")
  var myDate = new Date(); // 创建一个表示当前时间的 Date 对象
  var data_time = myDate.toLocaleDateString(); // 获取当前日期的字符串表示
  let server = jsonEmail.server;
  let port = parseInt(jsonEmail.port); // 转成整形
  let sender = jsonEmail.sender;
  let authorizationCode = jsonEmail.authorizationCode;
    if(qlSwitch != 1){  // 金山文档
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
    }else{    // 青龙
        const nodemailer = require('nodemailer');
        transporter = nodemailer.createTransport({
            host: server,
            port: port,
            auth: {
                user: sender,
                pass: authorizationCode,
            },
        });

        transporter.sendMail({
            from: pushHeader + "<" + sender + ">",
            to: sender,
            subject: pushHeader + " - " + data_time,
            text: message,
        });

        transporter.close();

    }
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
        }
        break;
      }
    }
  }
}

// 推送钉钉机器人
function dingtalk(message, key) {
    console.log("执行dingtalk")
  let url = "https://oapi.dingtalk.com/robot/send?access_token=" + key;
    if(qlSwitch != 1){    
        // 金山文档
        let resp = HTTP.post(url, { msgtype: "text", text: { content: message } });
    }else{
        // 青龙
        data = { msgtype: "text", text: { content: message } }
        var jsonData = JSON.stringify(data);
        resp = fetch(url, {
            method: 'post',
            headers: {'Content-Type': 'application/json'},
            body: jsonData
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            console.log(data);
        });
    }
}

// 推送Discord机器人
function discord(message, key) {
    console.log("执行discord")
  let url = key;
  if(qlSwitch != 1){    
    // 金山文档
    let resp = HTTP.post(url, { content: message });
  }else{
        // 青龙
        data = { content: message }
        var jsonData = JSON.stringify(data);
        resp = fetch(url, {
            method: 'post',
            headers: {'Content-Type': 'application/json'},
            body: jsonData
        })
        .then(function(response) {
            return response.json();
        })
        .then(function(data) {
            console.log(data);
        });
    }
}

// =================青龙适配结束===================

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

        // 青龙适配，青龙微适配
        if(qlSwitch != 1){  // 金山文档
            message = messageMerge()// 将消息数组融合为一条总消息
            push(message); // 推送消息
        }

}

// 将消息数组融合为一条总消息
function messageMerge(){
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

function sleep(d) {
  for (var t = Date.now(); Date.now() - t <= d; );
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

// cookie字符串转json格式
function cookie_to_json(cookies) {
  var cookie_text = cookies;
  var arr = [];
  var text_to_split = cookie_text.split(";");
  for (var i in text_to_split) {
    var tmp = text_to_split[i].split("=");
    arr.push('"' + tmp.shift().trim() + '":"' + tmp.join(":").trim() + '"');
  }
  var res = "{\n" + arr.join(",\n") + "\n}";
  return JSON.parse(res);
}

// 获取10 位时间戳
function getts10() {
  var ts = Math.round(new Date().getTime() / 1000).toString();
  return ts;
}

// 获取13位时间戳
function getts13(){
  // var ts = Math.round(new Date().getTime()/1000).toString()  // 获取10 位时间戳
  let ts = new Date().getTime()
  return ts
}

// 符合UUID v4规范的随机字符串 b9ab98bb-b8a9-4a8a-a88a-9aab899a88b9
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0,
        v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getUUIDDigits(length) {
    var uuid = generateUUID();
    return uuid.replace(/-/g, '').substr(16, length);
}
 

// 生成GMT+8时间戳
function getDateTimeString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 生成一定范围内的随机数
function randint(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 鸿星尔克专用sign
function HXEK_SIGN(memberId, appid){
  signArry = []
  // appid = "wxa1f1fa3785a47c7d"
  secret = 'damogic8888'
  // GMT+8时间戳
  // timestamp = '2024-06-06 13:24:09'
  timestamp = getDateTimeString()
  // console.log(timestamp)
  // 随机数
  // random_int = 1475835
  random_int = randint(1000000, 9999999)
  // console.log(random_int)
  // 待加密字符串
  raw_string = "timestamp=" + timestamp + "transId=" +appid + timestamp + "secret=" + secret + "random=" + random_int + "memberId=" + memberId
  console.log(raw_string)
  // MD5加密
  sign = getsign(raw_string)
  // console.log(sign)
  signArry = [sign, random_int, timestamp]
  return signArry
}

// json转参数
function jsontoparam(jsonObj){
  // console.log(jsonObj)
  // "?xxx=xxx;xxx=xxx;"
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
  // console.log(result)
  return result
}

// 青龙适配
// 结果处理函数
function resultHandle(resp, pos){
    let messageSuccess = "";
    let messageFail = "";
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

    if (resp.status == 200) {
        resp = resp.json();
        console.log(resp)

        // （修改这里，这里就是自己写了，根据抓包的响应自行修改）
        
        // {"reqMethodName":{},"errcode":0,"errmsg":"请求成功","response":{"reqMethodName":{},"errcode":0,"errmsg":{},"response":{},"memberSign":{"continuousCount":2,"integralCount":10,"moreDays":1,"moreIntegral":10},"expirePoints":0,"points":230}}
        // {"reqMethodName":{},"errcode":0,"errmsg":"您今天已签到","response":{},"memberSign":{},"expirePoints":0,"points":0}}
        // {"reqMethodName":{},"errcode":4,"errmsg":"缺少参数memberId","response":{},"memberSign":{},"expirePoints":0,"points":0}}
        errcode = resp["errcode"]           // 通过resp["键名"]的方式获取值.假设响应数据是情况1，则读取到数字“0”
        // respmsg = resp["message"]  // 通过resp["键名"]的方式获取值，假设响应数据是情况1，这里取到的值就是“签到成功”
        if(errcode == 0)       // 通过code值来判断是不是签到成功，由抓包的情况1知道，0代表签到成功了,所以让code与0比较
        { 
            // 这里是签到成功
            memberSign = resp["response"]["memberSign"]
            continuousCount = memberSign["continuousCount"]
            integralCount = memberSign["integralCount"]
            points = resp["response"]["points"]
            content = "当前积分:" + points + "连续签到:" + continuousCount + "天 "  // // 给自己看的，双引号内可以随便写
            messageSuccess += content;
            console.log(content)
        }
        else if(errcode == 900001)
        {
            errmsg =  resp["errmsg"]
            content = errmsg // "今天已签到 "  // // 给自己看的，双引号内可以随便写
            messageSuccess += content;
            console.log(content)
        }else
        {
            // 这里是签到失败
            msg = "签到失败 "   // 给自己看的，可以随便写，如 msg = "失败啦！ " 。
            
            content = msg + " "     
            messageFail += content;
            console.log(content)
        }

    } else {
        content = "签到失败 "
        messageFail += content;
        console.log(content);
    }

  // =================修改这块区域，区域结束=================

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
}

// 具体的执行函数
function execHandle(cookie, pos) {

  // =================修改这块区域，区域开始=================

  url1 = "https://hope.demogic.com/gic-wx-app/member_sign.json"; // 签到url（修改这里，这里填抓包获取到的地址）
  // url2 = "https://hope.demogic.com/gic-wx-app/get_member_grade_privileg.json"   // 获取用户信息
  appid = "wxa1f1fa3785a47c7d"  // 固定的

  memberId = Application.Range("D" + pos).Text;
  enterpriseId = Application.Range("E" + pos).Text;
//   console.log(memberId, enterpriseId)
  signArry = HXEK_SIGN(memberId, appid)
  sign = signArry[0]
  random_int = signArry[1]
  timestamp = signArry[2]
  transId = appid + timestamp
  console.log(sign, random_int, timestamp, transId)

  // （修改这里，这里填抓包获取header，全部抄进来就可以了，按照如下用引号包裹的格式，其中小写的cookie是从表格中读取到的值。）
  headers= {
    "Cookie": cookie,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36 Edg/91.0.864.70",
    'Host': 'hope.demogic.com',
    'xweb_xhr': '1',
    'channelEntrance': 'wx_app',
    'sign': enterpriseId,
    'Referer': 'https://servicewechat.com/wxa1f1fa3785a47c7d/55/page-frame.html',
    'Content-Type': 'application/x-www-form-urlencoded',
  }

  // （修改这里，这里填抓包获取data，全部抄进来就可以了，按照如下用引号包裹的格式。POST请求才需要这个，GET请求就不用它了）
  data = {
    "path":"pages/points-mall/member-task/member-task",
    "query":{},
    "scene":1256,
    "referrerInfo":{},
    "apiCategory":"default",
    'memberId': memberId,
    'cliqueId': '-1',
    'cliqueMemberId': '-1',
    'useClique': '0',
    'enterpriseId': enterpriseId,
    'appid': appid,
    'gicWxaVersion': '3.9.16',
    'random' : random_int,
    'sign' : sign,
    'timestamp' : timestamp,
    'transId' : transId,
  }
  // params = jsontoparam(params)
  // url1 = url1 + params
  // console.log(url1)

  // （修改这里，以下请求方式三选一即可)
  // // 请求方式1：POST请求，抓包的data数据格式是 {"aaa":"xxx","bbb":"xxx"} 。则用这个
  // resp = HTTP.post(
  //   url1,
  //   JSON.stringify(data),
  //   { headers: headers }
  // );

  // 请求方式2：POST请求，抓包的data数据格式是 aaa=xxx&bbb=xxx 。则用这个
  resp = HTTP.post(
    url1,
    data,
    { headers: headers }
  );

  // // 请求方式3：GET请求，无data数据。则用这个
  // resp = HTTP.get(
  //   url1,
  //   { headers: headers }
  // );
    
    // 青龙适配，青龙微适配
    if(qlSwitch != 1){  // 选择金山文档
        resultHandle(resp, pos)
    }

}