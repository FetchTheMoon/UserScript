// ==UserScript==
// @name            Soul++
// @namespace       SoulPlusPlus
// @version         0.60
// @description     让魂+论坛变得更好用一些
// @run-at          document-start
// @author          镜花水中捞月
// @homepage        https://github.com/FetchTheMoon
// @icon64          https://cdn.jsdelivr.net/gh/FetchTheMoon/UserScript/LOGO.png
// @supportURL      https://github.com/FetchTheMoon/UserScript/issues
// --------------------------------------------
// @match           https://*.spring-plus.net/*
// @match           https://*.summer-plus.net/*
// @match           https://*.soul-plus.net/*
// @match           https://*.south-plus.net/*
// @match           https://*.north-plus.net/*
// @match           https://*.snow-plus.net/*
// @match           https://*.level-plus.net/*
// @match           https://*.white-plus.net/*
// @match           https://*.imoutolove.me/*
// @match           https://*.south-plus.org/*
// --------------------------------------------
// @match           https://spring-plus.net/*
// @match           https://summer-plus.net/*
// @match           https://soul-plus.net/*
// @match           https://south-plus.net/*
// @match           https://north-plus.net/*
// @match           https://snow-plus.net/*
// @match           https://level-plus.net/*
// @match           https://white-plus.net/*
// @match           https://imoutolove.me/*
// @match           https://south-plus.org/*
// --------------------------------------------
// @grant           GM_getValue
// @grant           GM_setValue
// @grant           GM_listValues
// @grant           GM_registerMenuCommand
// @grant           GM_unregisterMenuCommand
// @grant           GM_notification
// @grant           GM_deleteValue
// @grant           unsafeWindow
// --------------------------------------------
// @license         GPL-3.0 License
// ==/UserScript==


//##############################################################
// 注册选项
//##############################################################
'use strict';
const PageType = Object.freeze({
    THREADS_PAGE: Symbol("普通主题列表"),
    PIC_WALL_PAGE: Symbol("图墙区主题列表"),
    POSTS_PAGE: Symbol("帖子列表"),
    SEARCH_RESULT: Symbol("搜索结果")
});

const OptionType = Object.freeze({
    CLICK: Symbol("点击生效一次的菜单项"),
    SWITCH: Symbol("点击切换开关的菜单项"),
});


let menu = [
    {
        key: "loadingBoughtPostWithoutRefresh",
        title: "免刷新显示购买内容",
        defaultValue: true,
        optionType: OptionType.SWITCH,
    },
    {
        key: "automaticTaskCollection",
        title: "自动领取并完成论坛任务",
        defaultValue: true,
        optionType: OptionType.SWITCH,
    },
    {
        key: "dynamicLoadingThreads",
        title: "无缝加载下一页的帖子",
        optionType: OptionType.SWITCH,
    },
    {
        key: "dynamicLoadingPosts",
        title: "无缝加载下一页的楼层",
        optionType: OptionType.SWITCH,
    },
    {
        key: "dynamicLoadingSearchResult",
        title: "无缝加载搜索页结果",
        optionType: OptionType.SWITCH,
    },
    {
        key: "dynamicLoadingPicWall",
        title: "无缝加载图墙区帖子",
        optionType: OptionType.SWITCH,
    },
    {
        key: "BlockSearchResultFromADForum",
        title: "屏蔽网赚区搜索结果",
        optionType: OptionType.SWITCH,
    },
    {
        key: "hidePostImage",
        title: "(sfw)安全模式 - 折叠帖子图片",
        optionType: OptionType.SWITCH,
    },
    {
        key: "hideUserAvatar",
        title: "(sfw)安全模式 - 替换用户头像为默认",
        optionType: OptionType.SWITCH,
    },
    {
        key: "highlightLastViewedThread",
        title: "在板块页面高亮刚才浏览的帖子",
        defaultValue: true,
        optionType: OptionType.SWITCH,
    },

];


class MenuOption {
    constructor(cfg) {
        this.key = cfg.key;
        this.title = cfg.title;
        this.defaultValue = cfg.defaultValue;
        this.onclick = cfg.onclick;
        if (GM_listValues().indexOf(this.key) === -1) GM_setValue(this.key, this.defaultValue ? this.defaultValue : false);
    }

    registerOption() {
        this.optionId = GM_registerMenuCommand(this.title, this.onclick);
    }

    unregisterOption() {
        GM_unregisterMenuCommand(this.optionId);
    }
}


class SwitchOption extends MenuOption {
    constructor(cfg) {
        super(cfg);
    }

    registerOption() {
        this.optionId = GM_registerMenuCommand(
            `${GM_getValue(this.key) ? '✅' : '❌'} ${this.title}`,
            this.onclick ? this.onclick : () => {
                GM_setValue(this.key, !GM_getValue(this.key));
                registerAllOptions();
                GM_notification(
                    {
                        text: `${this.title}已${GM_getValue(this.key) ? "✅启用" : "❌禁用"}\n刷新网页后生效`,
                        timeout: 2000,
                        onclick: () => location.reload(),
                        // 这个ondone不生效？
                        // ondone: ()=>location.reload()
                    });
                setTimeout(() => location.reload(), 2000);
            });
    }
}

function registerAllOptions() {
    menu.forEach((item) => {
        if (item.instance) item.instance.unregisterOption();
        switch (item.optionType) {
            case OptionType.SWITCH:
                item.instance = new SwitchOption(item);
                break;
            case OptionType.CLICK:
                item.instance = new MenuOption(item);
                break;
            default :
                item.instance = new MenuOption(item);
        }

        item.instance.registerOption();
    })
}


function getElementByXpath(from, xpath) {
    return from.evaluate(xpath, from, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}


//##############################################################
// 功能
//##############################################################

function loadingBoughtPostWithoutRefresh(target = document) {
    let buyButtons = target.querySelectorAll(".quote.jumbotron>.btn.btn-danger")
    buyButtons.forEach(button => {
        // 获取GET购买地址
        const urlRegex = /location\.href='(.+)'/
        const buyUrl = button.getAttribute("onclick");
        if (buyUrl === null) return;
        let m = buyUrl.match(urlRegex);
        if (m === null) return;
        let url = m[1];
        // 避免点击按钮的时候跳转，删掉这个属性
        button.setAttribute("onclick", "null");
        // 拿到帖子ID
        let postContainer = button.closest(".tpc_content .f14")
        let post_id = postContainer.getAttribute("id");
        // 添加点击事件，用fetch发送请求，然后读取页面再直接修改当前页面
        let customPurchase = (e => {
            e.stopPropagation();
            let btn = e.target;
            btn.setAttribute("value", "正在购买……请稍等………");
            try {
                fetch(url,
                    {
                        credentials: 'include',
                        mode: "no-cors"
                    })
                    .then(resp => resp.text())
                    .then(text => {
                        if (!text.includes("操作完成")) {
                            alert("购买失败！");
                            return;
                        }
                        let threadID = postContainer.getAttribute("tid");
                        let pg = postContainer.getAttribute("page");
                        let resultURL = `./read.php?tid=${threadID}&page=${pg}`;
                        fetch(resultURL, {
                            credentials: 'include',
                            mode: "no-cors"
                        }).then(resp => resp.text())
                            .then(html => {
                                let dummy = document.createElement("html");
                                dummy.innerHTML = html;
                                if (GM_getValue("hidePostImage")) {
                                    hidePostImage(dummy);
                                }
                                let purchased = dummy.querySelector("#" + post_id);
                                let notPurchased = document.querySelector("#" + post_id);
                                notPurchased.parentNode.replaceChild(purchased, notPurchased);

                            });

                        btn.style.display = "none";

                    });

            } catch (error) {
                alert(`发送请求出错，购买失败！\n${error}`);
                console.log('Request Failed', error);
            }
        })

        button.addEventListener("click", customPurchase);
    });
}

function hidePostImage(target = document) {
    let thread_user_post_images = target.querySelectorAll(".t5.t2 .r_one img");

    thread_user_post_images.forEach(img => {
        // 避免折叠论坛表情
        const emojiPathReg = /images\/post\/smile\//;
        if (img.getAttribute("src").match(emojiPathReg)) {
            return
        }
        // 避免折叠论坛自带的文件图标
        const fileIconPathReg = /images\/colorImagination\/file\//;
        if (img.getAttribute("src").match(fileIconPathReg)) {
            return
        }

        // 避免重复处理
        let p = img.parentNode;
        if (p.getAttribute("class") === "spp-img-mask") return;

        // 创建包裹元素
        let wrapper = document.createElement('div');
        wrapper.setAttribute("class", "spp-img-mask");
        wrapper.style.display = "grid";
        wrapper.style.gridTemplateColumns = "auto";

        // 将父元素下的图片元素替换成包裹元素
        img.parentNode.replaceChild(wrapper, img);

        // 将图片元素当成子元素放入包裹元素
        wrapper.appendChild(img);

        // 隐藏图片
        img.style.display = "none";
        img.style.textAlign = "center";

        // 添加类名
        img.setAttribute("class", "spp-thread-imgs");

        // 包裹元素样式
        wrapper.style.borderStyle = "dashed";
        wrapper.style.width = "auto";
        wrapper.style.height = "20";
        wrapper.style.textAlign = "center";
        wrapper.style.verticalAlign = "center";

        // 创建遮罩小人儿表情
        let icon_hide = document.createElement("img");
        icon_hide.setAttribute("src", "images/post/smile/smallface/face106.gif");

        let icon_show = document.createElement("img");
        icon_show.setAttribute("src", "images/post/smile/smallface/face109.gif");
        icon_show.style.display = "none";

        // 创建遮罩文本
        let tip = document.createElement("span");
        let tip_text = document.createElement("span");
        tip_text.innerText = "看看是啥";

        // 凑一堆儿来
        tip.appendChild(icon_hide);
        tip.appendChild(icon_show);
        tip.appendChild(tip_text);

        // 添加类名
        icon_hide.setAttribute("class", "spp-img-mask-icon-hide");
        icon_show.setAttribute("class", "spp-img-mask-icon-show");
        tip.setAttribute("class", "ssp-img-mask-text");

        // 插入元素
        wrapper.insertBefore(tip, img);

        // 事件监听
        wrapper.addEventListener("mouseenter", (e) => {
            e.stopPropagation();
            e.target.querySelector(".spp-thread-imgs").style.display = "";
            e.target.querySelector(".spp-img-mask-icon-hide").style.display = "none";
            e.target.querySelector(".spp-img-mask-icon-show").style.display = "";
        });
        wrapper.addEventListener("mouseleave", (e) => {
            e.stopPropagation();
            e.target.querySelector(".spp-thread-imgs").style.display = "none";
            e.target.querySelector(".spp-img-mask-icon-hide").style.display = "";
            e.target.querySelector(".spp-img-mask-icon-show").style.display = "none";
        });


    });
}

function hideUserAvatar(target = document) {
    let user_avatars = target.querySelectorAll(".user-pic img");
    user_avatars.forEach((avatar) => {
        let src = avatar.getAttribute("src");
        if (src !== "images/face/none.gif") {
            // 创建包裹元素
            let wrapper = document.createElement('div');
            wrapper.setAttribute("class", "spp-avatar-mask");

            // 创建一个假头像
            let fakeAvatarElement = document.createElement("img");
            fakeAvatarElement.setAttribute("src", "images/face/none.gif");
            fakeAvatarElement.style.borderStyle = "dashed";
            fakeAvatarElement.style.borderRadius = "3";
            fakeAvatarElement.style.borderWidth = "3px";
            fakeAvatarElement.style.borderColor = "Orange";

            // 替换包裹元素
            avatar.parentNode.replaceChild(wrapper, avatar);

            // 将假头像和真头像插到包裹元素中
            wrapper.appendChild(avatar);
            wrapper.appendChild(fakeAvatarElement);

            // 隐藏真头像
            avatar.style.display = "none";

            // 设置类名
            fakeAvatarElement.setAttribute("class", "spp-avatar-fake");
            avatar.setAttribute("class", "spp-avatar-real");

            // 事件监听
            wrapper.addEventListener("mouseenter", (e) => {
                e.stopPropagation();
                e.target.querySelector(".spp-avatar-fake").style.display = "none";
                e.target.querySelector(".spp-avatar-real").style.display = "";
            });

            wrapper.addEventListener("mouseleave", (e) => {
                e.stopPropagation();
                e.target.querySelector(".spp-avatar-fake").style.display = "";
                e.target.querySelector(".spp-avatar-real").style.display = "none";
            });

        }
    });
}

function dynamicLoadingNextPage(pageType) {

    class NextPageLoader {

        constructor() {
            this.isFetching = false;
            this.nextPageDummy = null;
        }

        GetURLDummy(url) {
            this.nextPageDummy = document.createElement("html");
            this.isFetching = true;
            return fetch(url, {credentials: 'include', mode: "no-cors"})
                .then(response => response.text())

        }

        AppendNextPageItems(itemSelector, divider) {

            let postsFragment = document.createDocumentFragment();
            this.nextPageDummy.querySelectorAll(itemSelector).forEach(ele => postsFragment.appendChild(ele));
            // 追加下一页的所有子项追加到分割线下面
            divider.parentNode.appendChild(postsFragment);
        }

        UpdatePageList() {
            // 主动更新帖子列表上下方的当前页码数
            let pagesOld = document.querySelectorAll(".pages");
            let pagesNew = this.nextPageDummy.querySelectorAll(".pages");
            for (let i = 0; i < pagesOld.length; i++) {
                pagesOld[i].parentNode.replaceChild(pagesNew[i], pagesOld[i]);
            }
        }

    }


    function getNextPageUrl() {
        let pageNum = document.querySelector(".pages b").parentNode;
        let url = pageNum.nextSibling.firstChild.getAttribute("href");
        if (pageNum.nextSibling.nextSibling.firstChild.getAttribute("class") === "pagesone") return null;
        if (document.URL.includes(url)) return null;
        return url;
    }


    function makeDivider(itemsSelector, dividerMaker) {
        let divider = dividerMaker();
        let allItem = document.querySelectorAll(itemsSelector);
        let lastItem = allItem[allItem.length - 1];
        lastItem.parentNode.appendChild(divider);
        return divider;
    }

    let nextPageLoader;
    let nextPageURL;
    nextPageLoader = nextPageLoader || new NextPageLoader()
    // 处理搜索结果页面
    if (pageType === PageType.SEARCH_RESULT) {
        document.addEventListener('wheel', (e) => {
            e.stopPropagation();
            const itemListSelector = ".tr3.tac";
            if (e.deltaY < 0 || nextPageLoader.isFetching) return;
            if (!nextPageLoader.nextPageDummy) {
                nextPageURL = getNextPageUrl();
                if (!nextPageURL) return;
                let divider = makeDivider(itemListSelector, () => {
                    let divider = document.createElement("tr");
                    let dividerContent = document.createElement("td");
                    divider.setAttribute("class", "tr2 spp-next-page-loader-divider")
                    divider.appendChild(dividerContent);
                    dividerContent.colSpan = 7;
                    dividerContent.style.textAlign = "center";
                    dividerContent.style.fontWeight = "bold";
                    dividerContent.innerText = "...";
                    return divider;
                });
                divider.firstChild.innerText = "正在获取下一页的帖子......";
                let p = nextPageLoader.GetURLDummy(nextPageURL);
                p
                    .then(html => {
                        nextPageLoader.nextPageDummy.innerHTML = html
                        if (GM_getValue("BlockSearchResultFromADForum")) BlockSearchResultFromADForum(nextPageLoader.nextPageDummy);
                    })
                    .catch(err => {
                        console.error(err);
                        divider.firstChild.innerText = "获取下一页的帖子出错，请手动刷新";
                    })
                    .finally(() => {
                        nextPageLoader.isFetching = false;
                        divider.firstChild.innerText = "滚动条到底后继续向下滚动将会加载下一页的帖子";
                    });

            }
            // 否则判断一下是否到底了，到底了就追加下一页的内容
            else if (Math.abs(document.documentElement.scrollHeight - (window.pageYOffset + window.innerHeight)) < 20) {
                let divider = getElementByXpath(document, "//tr[@class='tr2 spp-next-page-loader-divider'][last()]");
                nextPageLoader.AppendNextPageItems(itemListSelector, divider);
                nextPageLoader.UpdatePageList();

                divider.firstChild.innerText = `以下是第${nextPageURL.match(/page-(\d+)/)[1]}页`;
                window.history.pushState({}, 0, nextPageURL); // 将地址栏也改变了
                nextPageLoader.nextPageDummy = null;
            }

        })
    }
    // 处理主题列表页面
    if (pageType === PageType.THREADS_PAGE) {
        document.addEventListener('wheel', (e) => {
            e.stopPropagation();
            const itemListSelector = ".tr3.t_one";
            if (e.deltaY < 0 || nextPageLoader.isFetching) return;
            if (!nextPageLoader.nextPageDummy) {
                nextPageURL = getNextPageUrl();
                if (!nextPageURL) return;
                let divider = makeDivider(itemListSelector, () => {
                    let divider = document.createElement("tr");
                    let dividerContent = document.createElement("td");
                    divider.setAttribute("class", "tr2 spp-next-page-loader-divider")
                    divider.appendChild(dividerContent);
                    dividerContent.colSpan = 5;
                    dividerContent.style.textAlign = "center";
                    dividerContent.style.fontWeight = "bold";
                    dividerContent.innerText = "...";
                    return divider;
                });
                divider.firstChild.innerText = "正在获取下一页的帖子......";
                let p = nextPageLoader.GetURLDummy(nextPageURL);
                p
                    .then(html => {
                        nextPageLoader.nextPageDummy.innerHTML = html;
                        threadAddAnchorAttribute(nextPageLoader.nextPageDummy, page + 1, fid);
                        if (GM_getValue("highlightLastViewedThread")) highlightLastViewedThread(nextPageLoader.nextPageDummy);
                    })
                    .catch(err => {
                        console.error(err);
                        divider.firstChild.innerText = "获取下一页的帖子出错，请手动刷新";
                    })
                    .finally(() => {
                        nextPageLoader.isFetching = false;
                        divider.firstChild.innerText = "滚动条到底后继续向下滚动将会加载下一页的帖子";
                    });

            }
            // 否则判断一下是否到底了，到底了就追加下一页的内容
            else if (Math.abs(document.documentElement.scrollHeight - (window.pageYOffset + window.innerHeight)) < 20) {
                let divider = getElementByXpath(document, "//tr[@class='tr2 spp-next-page-loader-divider'][last()]");
                nextPageLoader.AppendNextPageItems(itemListSelector, divider);
                nextPageLoader.UpdatePageList();
                divider.firstChild.innerText = `以下是第${page + 1}页`;
                window.history.pushState({}, 0, nextPageURL); // 将地址栏也改变了
                page += 1;
                nextPageLoader.nextPageDummy = null;
            }

        })
    }
    // 处理楼层列表页面
    if (pageType === PageType.POSTS_PAGE) {
        document.addEventListener('wheel', (e) => {
            e.stopPropagation();
            const itemListSelector = ".t5.t2";
            if (e.deltaY < 0 || nextPageLoader.isFetching) return;
            if (!nextPageLoader.nextPageDummy) {
                nextPageURL = getNextPageUrl();
                if (!nextPageURL) return;
                let divider = makeDivider(itemListSelector, () => {
                    let divider = document.createElement("div");
                    let dividerContent = document.createElement("span");
                    divider.setAttribute("class", "t5 t2 spp-next-page-loader-divider")
                    divider.appendChild(dividerContent);
                    divider.style.textAlign = "center";
                    divider.style.fontWeight = "bold";
                    divider.style.fontSize = "14px";
                    divider.innerText = "...";
                    return divider;
                });
                divider.innerText = "加载中..";
                nextPageLoader.GetURLDummy(nextPageURL)
                    .then(html => {
                        nextPageLoader.nextPageDummy.innerHTML = html
                        postAddAnchorAttribute(nextPageLoader.nextPageDummy, page + 1, tid);
                        if (GM_getValue("loadingBoughtPostWithoutRefresh")) loadingBoughtPostWithoutRefresh(nextPageLoader.nextPageDummy);
                        if (GM_getValue("hidePostImage")) hidePostImage(nextPageLoader.nextPageDummy);
                        if (GM_getValue("hideUserAvatar")) hideUserAvatar(nextPageLoader.nextPageDummy);
                    })
                    .catch(err => {
                        console.error(err);
                        divider.innerText = "获取下一页的帖子出错，请手动刷新";
                    })
                    .finally(() => {
                        nextPageLoader.isFetching = false;
                        divider.innerText = "滚动条到底后继续向下滚动将会加载下一页的帖子";
                    });

            }
            // 否则判断一下是否到底了，到底了就追加下一页的内容
            else if (Math.abs(document.documentElement.scrollHeight - (window.pageYOffset + window.innerHeight)) < 20) {
                let divider = getElementByXpath(document, "//div[@class='t5 t2 spp-next-page-loader-divider'][last()]");
                nextPageLoader.AppendNextPageItems(itemListSelector, divider);
                nextPageLoader.UpdatePageList();
                divider.innerText = `以下是第${page + 1}页`;
                // window.history.pushState({}, 0, nextPageURL); // 将地址栏也改变了
                page += 1;
                nextPageLoader.nextPageDummy = null;
            }

        })
    }
    // 处理图墙区主题列表页面
    if (pageType === PageType.PIC_WALL_PAGE) {
        document.addEventListener('wheel', (e) => {
            e.stopPropagation();
            const itemListSelector = ".dcsns-li.dcsns-rss.dcsns-feed-0";
            if (e.deltaY < 0 || nextPageLoader.isFetching) return;
            if (!nextPageLoader.nextPageDummy) {
                nextPageURL = getNextPageUrl();
                if (!nextPageURL) return;
                let divider = makeDivider(itemListSelector, () => {
                    let divider = document.createElement("tr");
                    let dividerContent = document.createElement("td");
                    divider.setAttribute("class", "tr2 spp-next-page-loader-divider")
                    divider.appendChild(dividerContent);
                    dividerContent.colSpan = 5;
                    dividerContent.style.textAlign = "center";
                    dividerContent.style.fontWeight = "bold";
                    dividerContent.innerText = "...";
                    return divider;
                });
                divider.firstChild.innerText = "正在获取下一页的帖子......";
                let p = nextPageLoader.GetURLDummy(nextPageURL);
                p
                    .then(html => {
                        nextPageLoader.nextPageDummy.innerHTML = html;
                        nextPageLoader.nextPageDummy.querySelectorAll(".dcsns-li.dcsns-rss.dcsns-feed-0 .lazy").forEach(ele => {
                            ele.setAttribute("loading", "lazy");
                            ele.setAttribute("class", "");
                            ele.setAttribute("src", ele.getAttribute("data-original"));
                            ele.setAttribute("data-original", "");
                            ele.style.display = "inline";
                        });

                    })
                    .catch(err => {
                        console.error(err);
                        divider.firstChild.innerText = "获取下一页的帖子出错，请手动刷新";
                    })
                    .finally(() => {
                        nextPageLoader.isFetching = false;
                        divider.firstChild.innerText = "滚动条到底后继续向下滚动将会加载下一页的帖子";
                    });

            }
            // 否则判断一下是否到底了，到底了就追加下一页的内容
            else if (Math.abs(document.documentElement.scrollHeight - (window.pageYOffset + window.innerHeight)) < 20) {
                let divider = getElementByXpath(document, "//tr[@class='tr2 spp-next-page-loader-divider'][last()]");
                nextPageLoader.AppendNextPageItems(itemListSelector, divider);
                nextPageLoader.UpdatePageList();
                divider.firstChild.innerText = `以下是第${page + 1}页`;
                window.history.pushState({}, 0, nextPageURL); // 将地址栏也改变了
                page += 1;
                nextPageLoader.nextPageDummy = null;
            }

        })
    }
}

async function automaticTaskCollection() {

    function setUIDsValue(uid, value) {
        let tmp = GM_getValue("LastAutomaticTaskCollectionDate") || {};
        tmp[uid] = value;
        GM_setValue("LastAutomaticTaskCollectionDate", tmp);
    }

    if (document.querySelector("#login_0")) {
        console.log(`尚未登录，不接任务`);
        return
    }

    let uid = document.querySelector("#menu_profile .ul2").innerHTML.match(/u\.php\?action-show-uid-(\d+)\.html/)[1];
    let uname = document.querySelector("#user-login a").innerText;

    console.log(GM_getValue("LastAutomaticTaskCollectionDate"));
    let lastTime = GM_getValue("LastAutomaticTaskCollectionDate") ?
        (parseInt(GM_getValue("LastAutomaticTaskCollectionDate")[uid]) || 0) : 0;
    console.log(`${uname}[${uid}] 上次：${new Date(lastTime).toLocaleDateString()} ${new Date(lastTime).toLocaleTimeString()}`);


    if (new Date().getTime() - lastTime < (3600 * 1000)) {
        console.log("再等等……");
        return;
    }

    let sleep = (ms) => {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    async function forumTask(pageURL, selector, jobType) {
        let dummy = await fetch(
            pageURL,
            {credentials: 'include', mode: "no-cors"})
            .then(response => response.text())
            .then(html => {
                let dummy = document.createElement("html");
                dummy.innerHTML = html;
                return dummy
            })
            .catch(err => console.error(err));

        async function t(task) {
            let job = task.getAttribute("onclick");
            let r = job.match(/startjob\('(\d+)'\);/);
            let jobID = r[1];
            let taskURL = `/plugin.php?H_name=tasks&action=ajax&actions=${jobType}&cid=${jobID}&nowtime=${new Date().getTime()}&verify=${verifyhash}`;


            await fetch(taskURL, {credentials: 'include', mode: "no-cors"})
                .then(response => response.text())
                .then(html => {
                        console.log(html);
                        if (html.includes("success\t")) alert(html.match(/!\[CDATA\[success\t(.+)]]>/)[1]);
                    }
                )
                .catch(err => console.error(err));
        }

        await dummy.querySelectorAll(selector).forEach(t);

        console.log(`${pageURL} done, ${new Date().getTime()}`)
    }

    for (let i = 0; i < 2; i++) {
        forumTask(
            "/plugin.php?H_name-tasks.html",
            "a[title=按这申请此任务]",
            "job"
        ).catch(err => console.error(err));
        await sleep(3000);
        forumTask(
            "/plugin.php?H_name-tasks-actions-newtasks.html.html",
            "a[title=领取此奖励]",
            "job2"
        ).catch(err => console.error(err));
    }
    console.log(`${uname}[${uid}], 本次领取时间:${new Date().getTime()}`);
    setUIDsValue(uid, new Date().getTime());

}

function BlockSearchResultFromADForum(target = document) {
    target.querySelectorAll(".tr3.tac").forEach(ele => {
        let forum = ele.childNodes[2];
        if (forum.firstChild.getAttribute("href").match(/fid-17[1-4]/)) {
            ele.style.display = "none";
        }
    });
}

function BackToTop() {

    function isInViewPort(ele) {
        const viewWidth = window.innerWidth;
        const viewHeight = window.innerHeight;
        const {
            top,
            right,
            bottom,
            left,
        } = ele.getBoundingClientRect();

        return (
            top >= 0
            && left >= 0
            && right <= viewWidth
            && bottom <= viewHeight
        );
    }

    let backToTop = document.createElement("div");

    backToTop.innerHTML = "<button>回到顶部</button>";
    backToTop.setAttribute("id", "spp-back-to-top");
    backToTop.setAttribute("draggable", "true");
    backToTop.style.display = "block";
    backToTop.style.position = "fixed";
    backToTop.style.background = "#efefef";
    backToTop.style.left = "calc(50vw + 470px)";
    backToTop.style.bottom = "40px";
    backToTop.style.left = GM_getValue("backToTop_left") ? GM_getValue("backToTop_left") : "calc(50vw + 470px)";
    backToTop.style.bottom = GM_getValue("backToTop_bottom") ? GM_getValue("backToTop_bottom") : "40px";
    backToTop.style.zIndex = "99";
    backToTop.style.width = "30px";
    backToTop.style.padding = "10";
    backToTop.style.borderRadius = "5px";
    let main = document.getElementById("main");
    main.appendChild(backToTop);
    backToTop.addEventListener("click", (e) => {
        e.stopPropagation();
        window.scrollTo({top: 0, behavior: "smooth"});
    });
    let offsetX;
    let offsetY;

    backToTop.addEventListener("dragstart", (e) => {
        e.stopPropagation();
        // console.log(`e.offset:${e.offsetX},${e.offsetY}`);
        // 得到鼠标在元素内的偏移
        offsetX = e.offsetX;
        offsetY = e.offsetY;
    });

    backToTop.addEventListener("dragend", (e) => {
        e.stopPropagation();
        // alert("?");
        console.log(`e.client:${e.clientX},${e.clientY}`);
        // 获得丄的交叉点坐标
        let _50vw = window.innerWidth / 2;
        let _100vh = window.innerHeight;

        // 计算出相对丄交叉点的偏移量
        let offsetLeft = e.clientX - offsetX - _50vw;
        let offsetBottom = _100vh - e.clientY - (e.target.clientHeight - offsetY);

        // 防止拖到视口以外了
        if (_50vw + offsetLeft >= 0
            && _50vw + offsetLeft + e.target.clientWidth <= window.innerWidth
            && offsetBottom > 0
            && offsetBottom + e.target.clientHeight <= window.innerHeight
        ) {
            backToTop.style.left = `calc(50vw + ${offsetLeft}px)`;
            backToTop.style.bottom = `${offsetBottom}px`;

            GM_setValue("backToTop_left", backToTop.style.left);
            GM_setValue("backToTop_bottom", backToTop.style.bottom);
        }

    });


}

function postAddAnchorAttribute(target, pg, threadID) {
    target.querySelectorAll(".tpc_content .f14").forEach(ele => {
        ele.setAttribute("page", pg);
        ele.setAttribute("tid", threadID);
        let pid = ele.previousElementSibling.getAttribute("name");
        ele.setAttribute("pid", pid);

    });
}

function threadAddAnchorAttribute(target, pg, forumID) {
    target.querySelectorAll(".tr3.t_one").forEach(ele => {
        ele.setAttribute("page", pg);
        ele.setAttribute("fid", forumID);
        let tid_m = ele.querySelector("a").getAttribute("href").match(/tid-(\d+)/);
        if (!tid_m) return;
        let tid = tid_m[1];
        ele.setAttribute("tid", tid);

    });
}

function highlightLastViewedThread(target = document) {
    target.querySelectorAll("a").forEach(ele => {
         
        let threadContainer = ele.closest(".tr3.t_one");
        if (!threadContainer) return;
        let tid = threadContainer.getAttribute("tid");

        function recordTid(event) {
            event.stopPropagation();
            sessionStorage.setItem("lastViewedThread", tid);
        }

        ele.addEventListener("click", recordTid);
        // ele.addEventListener("dragend", recordTid);
        console.log(`上次浏览的帖子tid：${sessionStorage.getItem("lastViewedThread")}`);
        if (ele.getAttribute("id") === `a_ajax_${sessionStorage.getItem("lastViewedThread")}`) {
            ele.parentNode.parentNode.parentNode.style.backgroundColor = "#deeeff";

            document.addEventListener('readystatechange', (event) => {
                if (document.readyState === "complete") {

                    history.scrollRestoration = "manual";
                    ele.scrollIntoView({behavior: "auto", block: "center"});

                }
            });
        }
    });
}

//##############################################################
// 执行入口
//##############################################################
(function () {


    registerAllOptions();

    let mainInterval = setInterval(main, 50);
    let mainStart = (new Date()).getTime();

    function main() {

        // 避免有些外链图一直加载不完，在那转圈圈，让脚本一直无法生效
        document.querySelectorAll("img").forEach(e => e.setAttribute("loading", "lazy"));

        if ((new Date()).getTime() - mainStart > 20000 || document.readyState === "interactive"
            || document.readyState === "complete") {
            clearInterval(mainInterval);
        } else {
            return
        }

        //##############################################################
        // 调试代码
        //##############################################################
        // GM_listValues().forEach(vName => {console.log(vName);GM_deleteValue(vName);});
        // console.log(GM_listValues());
        // return;
        //##############################################################
        BackToTop();

        if (document.location.href.includes("/read.php")) {
            postAddAnchorAttribute(document, page, tid);
        }
        if (document.location.href.includes("/thread.php")) {
            threadAddAnchorAttribute(document, page, fid);
        }
        if (GM_getValue("loadingBoughtPostWithoutRefresh") && document.location.href.includes("/read.php")) {
            loadingBoughtPostWithoutRefresh();
        }
        if (GM_getValue("hidePostImage") && document.location.href.includes("/read.php")) {
            hidePostImage();
        }
        if (GM_getValue("hideUserAvatar") && document.location.href.includes("/read.php")) {
            hideUserAvatar();
        }
        if (GM_getValue("dynamicLoadingThreads") && (document.location.href.includes("/thread.php"))) {
            dynamicLoadingNextPage(PageType.THREADS_PAGE);
        }
        if (GM_getValue("dynamicLoadingPicWall") && document.location.href.includes("/thread_new.php")) {
            dynamicLoadingNextPage(PageType.PIC_WALL_PAGE);
        }
        if (GM_getValue("dynamicLoadingPosts") && document.location.href.includes("/read.php")) {
            dynamicLoadingNextPage(PageType.POSTS_PAGE);
        }
        if (GM_getValue("dynamicLoadingSearchResult") && document.location.href.includes("/search.php")) {
            dynamicLoadingNextPage(PageType.SEARCH_RESULT);
        }
        if (GM_getValue("BlockSearchResultFromADForum") && document.location.href.includes("/search.php")) {
            BlockSearchResultFromADForum();
        }
        if (GM_getValue("automaticTaskCollection")) {
            automaticTaskCollection();
        }
        if (GM_getValue("highlightLastViewedThread") && (document.location.href.includes("/thread.php") || document.location.href.includes("/thread_new.php"))) {
            highlightLastViewedThread();
        }

    }
})()



