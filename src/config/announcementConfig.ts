import type { AnnouncementConfig } from "../types/announcementConfig";

export const announcementConfig: AnnouncementConfig = {
	// 公告标题
	title: "广而告之",

	// 公告内容
	content: "白绫冰，金彩媚，万丈红尘缤纷彩，天涯云雪路遥长，此刻风流归天地，不胜水中明月光。",

	// 是否允许用户关闭公告
	closable: true,

	link: {
		// 启用链接
		enable: true,
		// 链接文本
		text: "了解更多",
		// 链接 URL
		url: "/about/",
		// 内部链接
		external: false,
	},
};
