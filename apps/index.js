import lodash from "lodash";
import schedule from "node-schedule";
import {
	versionInfo,
	help
} from "./help.js";
import {
	rule as mapRule,
	genShenMap,delMapData
} from './map.js'
import {
	rule as adminRule,
	updateRes,
	sysCfg, updateTemp,
	updateMiaoPlugin
} from "./admin.js";

import {
	rule as userRule,
	delSign,
	updCookie,
	userInfo,
	gclog,
	mytoken, gcPaylog,
	bindStoken, bindLogin_ticket,
	cloudToken
} from "./user.js"
import {
	rule as topupLoginRule,
	qrCodeLogin,UserPassMsg,UserPassLogin,payOrder
} from './mhyTopUpLogin.js'
export {
	updateRes, updateTemp,
	delSign, gcPaylog,delMapData,
	qrCodeLogin,
	bindLogin_ticket,payOrder,
	UserPassMsg,UserPassLogin,
	gclog,
	mytoken, 
	bindStoken,
	updateMiaoPlugin,
	userInfo,

	versionInfo,
	cloudToken,


	genShenMap,
	
	sysCfg,
	help,
	updCookie,

};
import gsCfg from '../model/gsCfg.js';
const _path = process.cwd();

let rule = {
	versionInfo: {
		reg: "^#图鉴版本$",
		describe: "【#帮助】 图鉴版本介绍",
	},
	
	...userRule,

	...adminRule,
	...topupLoginRule,
	...mapRule
};

lodash.forEach(rule, (r) => {
	r.priority = r.priority || 50;
	r.prehash = true;
	r.hashMark = true;
});
task();
//定时任务
async function task() {
	if (typeof test != "undefined") return;
	let set = gsCfg.getfileYaml(`${_path}/plugins/xiaoyao-cvs-plugin/config/`, "config")
	schedule.scheduleJob(set.mysBbsTime, function () {
		if (set.ismysSign) {
			signTask('bbs')
		}
	});
	schedule.scheduleJob(set.allSignTime, function () {
		if (set.isSign) {
			signTask('mys')
		}
	});
	schedule.scheduleJob(set.cloudSignTime, function () {
		if (set.isCloudSign) {
			signTask('cloud')
		}
	});
	schedule.scheduleJob(set.noteTask, function () {
		if (set.isNoteTask) {
			DailyNoteTask()
		}
	});
}


export {
	rule
};
