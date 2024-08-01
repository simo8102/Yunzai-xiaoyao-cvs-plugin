import utils from '../model/mys/utils.js';
import {
	Cfg,
	Data
} from "../components/index.js";
import moment from 'moment';
import Common from "../components/Common.js";
import {
	isV3
} from '../components/Changelog.js';
import gsCfg from '../model/gsCfg.js';
import fs from "fs";
import YAML from 'yaml'
import User from "../model/user.js"

export const rule = {
	userInfo: {
		reg: "^#*(ck|stoken|cookie|cookies|签到)查询$",
		describe: "用户个人信息查询"
	},
	gcPaylog: { //避免指令冲突
		reg: "^#*(刷新|获取|导出)(充值|氪金)记录$",
		describe: "刷新充值记录"
	},
	bindStoken: {
		reg: "^(.*)stoken=(.*)$",
		describe: "绑定stoken"
	},
	bindLogin_ticket: {
		reg: "^(.*)login_ticket=(.*)$",
		describe: "绑定ck自动获取sk"
	},
	delSign: {
		reg: "^#*删除(我的)*((stoken|sk)|(云原神|云ck))$",
		describe: "删除云原神、stoken数据"
	},
	updCookie: {
		reg: "^#*(刷新|更新|获取)(ck|cookie)$",
		describe: "刷新cookie"
	}
}
const _path = process.cwd();
const YamlDataUrl = `${_path}/plugins/xiaoyao-cvs-plugin/data/yaml`;
const yunpath = `${_path}/plugins/xiaoyao-cvs-plugin/data/yunToken/`;
export async function userInfo(e, {
	render
}) {
	let user = new User(e);
	e.reply("正在获取角色信息请稍等...")
	let sumData = await user.getCkData()
	let week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
	let day = moment(new Date()).format("yyyy年MM月DD日 HH:mm") + " " + week[new Date().getDay()];
	if (Object.keys(sumData).length == 0) {
		e.reply("未获取到角色信息~")
		return true;
	}
	let ck = "";
	if (e.cookie) {
		ck = await utils.getCookieMap(e.cookie);
		ck = ck?.get("ltuid")
	}
	return await Common.render(`user/userInfo`, {
		uid: e.user_id,
		ltuid: ck || e.user_id,
		save_id: e.user_id,
		day,
		sumData
	}, {
		e,
		render,
		scale: 1.2
	})
}
let configData = gsCfg.getfileYaml(`${_path}/plugins/xiaoyao-cvs-plugin/config/`, "config");
export async function gcPaylog(e) {
	let user = new User(e);
	await user.cookie(e)
	let redis_Data = await redis.get(`xiaoyao:gcPaylog:${e.user_id}`);
	if (redis_Data) {
		let time = redis_Data * 1 - Math.floor(Date.now() / 1000);
		e.reply(`请求过快,请${time}秒后重试...`);
		return true;
	}
	let isGet = /导出|获取/.test(e.msg)
	if (!e.isPrivate && isGet) {
		e.reply("请私聊发送")
		return true;
	}
	let authkey = await getAuthKey(e, user,{auth_appid:'csc'})
	if (!authkey) {
		return true;
	}
	let url = `https://webstatic.mihoyo.com/event/user-game-search/hk4e/index.html?selfquery_type=3&lang=zh-cn&sign_type=2&auth_appid=csc&authkey_ver=1&authkey=${encodeURIComponent(authkey)}&game_biz=hk4e_cn&app_client=bbs&type=3&size=6&region=${e.region}&end_id=`
	e.msg = url
	// e.reply(e.msg)
	let sendMsg = [];
	e.reply("充值记录获取中请稍等...")
	e._reply = e.reply;
	e.reply = (msg) => {
		sendMsg.push(msg)
	}
	if (isGet) {
		sendMsg = [...sendMsg, ...[1, `uid:${e.uid}`, e.msg]]
	} else {
		let time = (configData.gclogEx || 5) * 60
		redis.set(`xiaoyao:gcPaylog:${e.user_id}`, Math.floor(Date.now() / 1000) + time, { //数据写入缓存避免重复请求
			EX: time
		});
		if (isV3) {
			let { payLog } = (await import(`file://${_path}/plugins/genshin/apps/payLog.js`))
			let pl = (new payLog())
			e.isGroup = false;
			pl.e = e
			await pl.getAuthKey(e)
			e._reply(sendMsg[1]);
			return true;
			// await (new payLog()).payLog(e)
		} else {
			e._reply(`V2暂不支持`);
			return false
		}
	}
	await utils.replyMake(e, sendMsg, 1)
	return true;
}
export async function gclog(e) {
	let user = new User(e);
	await user.cookie(e)
	let redis_Data = await redis.get(`xiaoyao:gclog:${e.user_id}`);
	if (redis_Data) {
		let time = redis_Data * 1 - Math.floor(Date.now() / 1000);
		e.reply(`请求过快,请${time}秒后重试...`);
		return true;
	}
	let isGet = /导出|获取/.test(e.msg)
	if (!e.isPrivate && isGet) {
		e.reply("请私聊发送")
		return true;
	}
	let authkey = await getAuthKey(e, user)
	if (!authkey) {
		return true;
	}
	let url = `https://public-operation-hk4e.mihoyo.com/gacha_info/api/getGachaLog?authkey_ver=1&sign_type=2&auth_appid=webview_gacha&init_type=301&gacha_id=fecafa7b6560db5f3182222395d88aaa6aaac1bc&timestamp=${Math.floor(Date.now() / 1000)}&lang=zh-cn&device_type=mobile&plat_type=ios&region=${e.region}&authkey=${encodeURIComponent(authkey)}&game_biz=hk4e_cn&gacha_type=301&page=1&size=5&end_id=0`
	e.msg = url
	// e.reply(e.msg)
	let sendMsg = [];
	e.reply("抽卡记录获取中请稍等...")
	e._reply = e.reply;
	e.reply = (msg) => {
		sendMsg.push(msg)
	}
	if (isGet) {
		sendMsg = [...sendMsg, ...[1, `uid:${e.uid}`, e.msg]]
	} else {
		if (isV3) {
			let gclog = (await import(`file://${_path}/plugins/genshin/model/gachaLog.js`)).default
			await (new gclog(e)).logUrl()
		} else {
			let {
				bing
			} = (await import(`file://${_path}/lib/app/gachaLog.js`))
			e.isPrivate = true;
			await bing(e)
		}
	}
	await utils.replyMake(e, sendMsg, 1)
	let time = (configData.gclogEx || 5) * 60
	redis.set(`xiaoyao:gclog:${e.user_id}`, Math.floor(Date.now() / 1000) + time, { //数据写入缓存避免重复请求
		EX: time
	});
	return true;
}
async function getAuthKey(e, user,data={
	auth_appid:'webview_gacha'
}) {
	if (!e.uid) {
		e.uid = e?.runtime?.user?._regUid
	}
	e.region = getServer(e.uid)
	let authkeyrow = await user.getData("authKey", data);
	if (!authkeyrow?.data) {
		e.reply(`uid:${e.uid},authkey获取失败：` + (authkeyrow.message.includes("登录失效") ? "请重新绑定stoken" : authkeyrow.message))
		return false;
	}
	return authkeyrow.data["authkey"];
}
export async function mytoken(e) {
	if (!e.isPrivate) {
		e.reply("请私聊发送")
		return true;
	}
	let user = new User(e);
	let msg = e.msg.replace(/#|我的/g, "");
	let ck, sendMsg;
	if (msg === "stoken") {
		await user.getCookie(e)
		ck = await user.getStoken(e.user_id)
		sendMsg = `stuid=${ck.stuid};stoken=${ck.stoken};ltoken=${ck.ltoken};`;
		if (ck?.mid) sendMsg += `mid=${ck?.mid};`
	} else {
		ck = await user.getyunToken(e);
		sendMsg = `${ck.yuntoken}devId=${ck.devId}`
	}
	if (sendMsg.includes("undefined")) {
		e.reply(`您暂未绑定${msg}`);
		return true;
	}
	e.reply(sendMsg)
	return true;
}

export async function bindLogin_ticket(e) {
	if (!e.isPrivate) {
		e.reply("请私聊发送")
		return true;
	}
	let user = new User(e);
	let ckMap = await utils.getCookieMap(e.original_msg.replace(/'|"/g, ""))
	let stuid = ckMap?.get("login_uid") ? ckMap?.get("login_uid") : ckMap?.get("ltuid")
	if (!stuid) stuid = ckMap?.get("account_id");
	if (ckMap && Cfg.get("ck.sk")) {
		let res = await user.getData("bbsStoken", {
			loginUid: stuid,
			loginTicket: ckMap.get("login_ticket"),
		})
		if (res?.retcode === 0) {
			e.stuid = stuid;
			await user.seachUid(res)
		}
	}
	return false;
}

export async function bindStoken(e, uid = '') {
	if (!e.isPrivate) {
		e.reply("请私聊发送")
		return true;
	}
	let msg = e.msg;
	let user = new User(e);
	await user.cookie(e)
	e.uid = uid || e.uid
	e.region = getServer(e.uid)
	e.cks = msg.replace(/;/g, '&').replace(/stuid/, "uid")
	e.sk = await utils.getCookieMap(msg)
	let res = await user.getData("bbsGetCookie", { cookies: e.cks }, false)
	if (!res?.data) {
		e.uid = "64"
		e.region = getServer(e.uid)
		res = await user.getData("bbsGetCookie", { cookies: e.cks, method: 'post' }, false)
		if (!res?.data) {
			await e.reply(`绑定Stoken失败，异常：${res?.message}\n请发送【stoken帮助】查看配置教程重新配置~`);
			return true;
		} else {
			await user.seachUid(res);
			return true;
		}
	}
	// await user.getCookie(e)
	await user.seachUid(res);
	return true;
}
export async function cloudToken(e) {
	if (e.msg.includes("ltoken") || e.msg.includes("_MHYUUID")) { //防止拦截米社cookie
		return false;
	}
	if (["ct", "si", "devId"].includes(e.msg)) {
		e.reply(`格式支持\nai=*;ci=*;oi=*;ct=***********;si=**************;bi=***********;devId=***********`)
		return false;
	}
	let msg = e.msg.replace(/dev(i|l|I|L)d/g, 'devId').split("devId")
	if (msg.length < 2) {
		Bot.logger.mark(`云原神绑定失败：未包含devId字段~`)
		return false;
	}
	let devId = msg[1].replace(/=/, "")
	let user = new User(e);
	let yuntoken = msg[0];
	e.devId = devId;
	e.yuntoken = yuntoken;
	let res = await user.cloudSeach()
	if (res.retcode != 0) {
		e.reply(res.message)
		return true;
	}
	let datalist = {
		devId: devId,
		yuntoken: yuntoken,
		qq: e.user_id,
		uid: e.uid,
		sign: true
	}
	let yamlStr = YAML.stringify(datalist);
	fs.writeFileSync(`${yunpath}${e.user_id}.yaml`, yamlStr, 'utf8');
	e.reply("云原神cookie保存成功~\n您后续可发送【#云原神查询】获取使用时间~")
	return true;
}

export async function delSign(e) {
	let user = new User(e);
	e.msg = e.msg.replace(/#|删除|我的/g, "");
	let url = /sk|stoken/.test(e.msg) ? `${YamlDataUrl}` : `${yunpath}`;
	await user.delSytk(url, e)
	return true;
}
export async function updCookie(e) {
	let stoken = await gsCfg.getUserStoken(e.user_id);
	if (Object.keys(stoken).length == 0) {
		e.reply("请先绑定stoken\n发送【stoken帮助】查看配置教程")
		return true;
	}
	let isGet = e.msg.includes("获取")
	if (!e.isPrivate && isGet) {
		e.reply("请私聊发送")
		return true;
	}
	let user = new User(e);
	let sendMsg = [];
	e._reply = e.reply;
	e.reply = (msg) => {
		sendMsg.push(msg)
	}
	for (let item of Object.keys(stoken)) {
		e.region = getServer(stoken[item].uid)
		e.uid = stoken[item].uid
		if (!e?.uid) {
			Bot.logger.mark(`[刷新ck][stoken读取]qq:${e?.user_id}；uid:${e?.uid}`)
			continue; //奇怪的东西
		}
		let cookies = `uid=${stoken[item].stuid}&stoken=${stoken[item].stoken}`
		if (stoken[item]?.mid) cookies += `&mid=${stoken[item]?.mid}`
		let data = { cookies: cookies }
		if (e?.uid[0] > 5) data.method = 'post'
		let res = await user.getData("bbsGetCookie", data, false)
		if (!res?.data) {
			e.reply(`uid:${stoken[item].uid},请求异常：${res.message}`)
			continue;
		}
		let ck = res["data"]["cookie_token"];
		e.msg = `ltoken=${stoken[item].ltoken};ltuid=${stoken[item].stuid};cookie_token=${ck}; account_id=${stoken[item].stuid};`
		if (isGet) {
			sendMsg = [...sendMsg, ...[`uid:${stoken[item].uid}`, e.msg]]
		} else {
			if (isV3) {
				let userck = (await import(`file://${_path}/plugins/genshin/model/user.js`)).default
				e.ck = e.msg;
				await (new userck(e)).bing()
			} else {
				let {
					bingCookie
				} = (await import(`file://${_path}/lib/app/dailyNote.js`))
				e.isPrivate = true;
				await bingCookie(e)
			}
		}
	}
	await utils.replyMake(e, sendMsg, 0)
	return true;
}

function getServer(uid) {
	switch (String(uid)[0]) {
		case '1':
		case '2':
			return 'cn_gf01' // 官服
		case '5':
			return 'cn_qd01' // B服
		case '6':
			return 'os_usa' // 美服
		case '7':
			return 'os_euro' // 欧服
		case '8':
			return 'os_asia' // 亚服
		case '9':
			return 'os_cht' // 港澳台服
	}
	return 'cn_gf01'
}