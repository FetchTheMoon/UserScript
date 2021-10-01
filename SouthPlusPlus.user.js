// ==UserScript==
// @name            Soul++
// @namespace       SoulPlusPlus
// @version         0.41
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
// @license         GPL-3.0 License
// ==/UserScript==


//##############################################################
// 注册选项
//##############################################################
'use strict';

let menu = [
    {
        key: "loadingBoughtPostWithoutRefresh",
        title: "免刷新显示购买内容",
        defaultValue: true
    },
    {
        key: "automaticTaskCollection",
        title: "自动领取并完成论坛任务",
        defaultValue: true
    },
    {
        key: "dynamicLoadingThreads",
        title: "无缝加载下一页的帖子"
    },
    {
        key: "dynamicLoadingPosts",
        title: "无缝加载下一页的楼层"
    },
    {
        key: "hidePostImage",
        title: "(sfw)安全模式 - 折叠帖子图片"
    },
    {
        key: "hideUserAvatar",
        title: "(sfw)安全模式 - 替换用户头像为默认"
    },
];


class MenuSwitchOption {
    constructor(key, optionName, defaultValue) {
        this.key = key;
        this.optionName = optionName;
        this.defaultValue = defaultValue;

        if (GM_listValues().indexOf(this.key) === -1) GM_setValue(this.key, this.defaultValue ? this.defaultValue : false);
    }

    registerOption() {
        this.optionId = GM_registerMenuCommand(`${GM_getValue(this.key) ? '✅' : '❌'} ${this.optionName}`, () => {
            GM_setValue(this.key, !GM_getValue(this.key));
            registerAllOptions();
            GM_notification(
                {
                    text: `${this.optionName}已${GM_getValue(this.key) ? "✅启用" : "❌禁用"}\n刷新网页后生效`,
                    timeout: 2000,
                    onclick: () => location.reload(),
                    // 这个ondone不生效？
                    // ondone: ()=>location.reload()
                });
            setTimeout(() => location.reload(), 2000);

        });
    }

    unregisterOption() {
        GM_unregisterMenuCommand(this.optionId);
    }
}


function registerAllOptions() {
    menu.forEach((item) => {
        if (item.instance) item.instance.unregisterOption();
        item.instance = new MenuSwitchOption(item.key, item.title, item.defaultValue);
        item.instance.registerOption();
    })
}

registerAllOptions();

function getElementByXpath(from, xpath) {
    return from.evaluate(xpath, from, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
}

//##############################################################
// 功能
//##############################################################

function loadingBoughtPostWithoutRefresh() {
    let buyButtons = document.querySelectorAll(".quote.jumbotron>.btn.btn-danger")
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
        let postContainer = button.parentNode.parentNode;
        let post_id = postContainer.getAttribute("id");

        // 添加点击事件，用fetch发送请求，然后读取页面再直接修改当前页面
        let customPurchase = (e => {
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
                        if (text.indexOf("操作完成") === -1) {
                            alert("购买失败！");
                        }
                        fetch(document.URL, {
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
            e.target.querySelector(".spp-thread-imgs").style.display = "";
            e.target.querySelector(".spp-img-mask-icon-hide").style.display = "none";
            e.target.querySelector(".spp-img-mask-icon-show").style.display = "";
        });
        wrapper.addEventListener("mouseleave", (e) => {
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
                e.target.querySelector(".spp-avatar-fake").style.display = "none";
                e.target.querySelector(".spp-avatar-real").style.display = "";
            });

            wrapper.addEventListener("mouseleave", (e) => {
                e.target.querySelector(".spp-avatar-fake").style.display = "";
                e.target.querySelector(".spp-avatar-real").style.display = "none";
            });

        }
    });
}

const PageType = Object.freeze({
    THREADS_PAGE: Symbol("主题列表"),
    POSTS_PAGE: Symbol("帖子列表"),
});

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
        let url = document.querySelector(".pages b").parentNode.nextSibling.firstChild.getAttribute("href");
        return document.URL.indexOf(url) > -1 ? null : url;
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
    // 处理主题列表页面
    if (pageType === PageType.THREADS_PAGE) {
        document.addEventListener('wheel', (e) => {
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
                    .then(html => nextPageLoader.nextPageDummy.innerHTML = html)
                    .catch(err => {
                        console.error(err);
                        divider.firstChild.innerText = "获取下一页的帖子出错，请手动刷新";
                    })
                    .finally(() => {
                        nextPageLoader.isFetching = false;
                        divider.firstChild.innerText = "继续向下滚动将会加载下一页的帖子";
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
                        if (GM_getValue("hidePostImage")) hidePostImage(nextPageLoader.nextPageDummy);
                        if (GM_getValue("hideUserAvatar")) hideUserAvatar(nextPageLoader.nextPageDummy);
                    })
                    .catch(err => {
                        console.error(err);
                        divider.innerText = "获取下一页的帖子出错，请手动刷新";
                    })
                    .finally(() => {
                        nextPageLoader.isFetching = false;
                        divider.innerText = "继续向下滚动将会加载下一页的帖子";
                    });

            }
            // 否则判断一下是否到底了，到底了就追加下一页的内容
            else if (Math.abs(document.documentElement.scrollHeight - (window.pageYOffset + window.innerHeight)) < 20) {
                let divider = getElementByXpath(document, "//div[@class='t5 t2 spp-next-page-loader-divider'][last()]");
                nextPageLoader.AppendNextPageItems(itemListSelector, divider);
                nextPageLoader.UpdatePageList();
                divider.innerText = `以下是第${page + 1}页`;
                window.history.pushState({}, 0, nextPageURL); // 将地址栏也改变了
                page += 1;
                nextPageLoader.nextPageDummy = null;
            }

        })
    }

    let backToTop = document.createElement("div")
    backToTop.innerHTML =
        `<button id="spp-back-to-top">回到顶部</button>`
    backToTop.style.display = "block";
    backToTop.style.position = "fixed";
    backToTop.style.bottom = "20px";
    backToTop.style.right = "30px";
    backToTop.style.zIndex = "99";
    backToTop.style.width = "0";
    backToTop.style.padding = "10";
    backToTop.style.borderRadius = "10px";
    let main = document.getElementById("main");
    main.appendChild(backToTop);
    backToTop.addEventListener("click", () => window.scrollTo({top: 0, behavior: 'smooth'}))

}

function automaticTaskCollection() {

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
                        if (html.indexOf("success\t") > -1) alert(html.match(/!\[CDATA\[success\t(.+)]]>/)[1]);
                    }
                )
                .catch(err => console.error(err));
        }

        dummy.querySelectorAll(selector).forEach(t);


    }

    for (let i = 0; i < 2; i++) {
        forumTask(
            "/plugin.php?H_name-tasks.html",
            "a[title=按这申请此任务]",
            "job"
        ).catch(err => console.error(err));

        forumTask(
            "/plugin.php?H_name-tasks-actions-newtasks.html.html",
            "a[title=领取此奖励]",
            "job2"
        ).catch(err => console.error(err));
    }
    console.log(`本次领取时间:${new Date().getTime()}`);
    GM_setValue("LastAutomaticTaskCollectionDate", new Date().getTime());


}

//##############################################################
// 执行入口
//##############################################################
(function () {
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

        if (GM_getValue("loadingBoughtPostWithoutRefresh") && document.location.href.indexOf("/read.php") > -1) {
            loadingBoughtPostWithoutRefresh();
        }
        if (GM_getValue("hidePostImage") && document.location.href.indexOf("/read.php") > -1) {
            hidePostImage();
        }
        if (GM_getValue("hideUserAvatar") && document.location.href.indexOf("/read.php") > -1) {
            hideUserAvatar();
        }
        if (GM_getValue("dynamicLoadingThreads") && document.location.href.indexOf("/thread.php") > -1) {
            dynamicLoadingNextPage(PageType.THREADS_PAGE);
        }
        if (GM_getValue("dynamicLoadingPosts") && document.location.href.indexOf("/read.php") > -1) {
            dynamicLoadingNextPage(PageType.POSTS_PAGE);
        }


        if (GM_getValue("automaticTaskCollection")
            && (new Date().getTime()) - (parseInt(GM_getValue("LastAutomaticTaskCollectionDate")) || 0) > (18 * 3600 * 1000)
        ) {
            automaticTaskCollection();
        }


    }
})()



