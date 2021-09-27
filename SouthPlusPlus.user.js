// ==UserScript==
// @name            Soul++
// @namespace       SoulPlusPlus
// @version         0.2
// @description     让魂+论坛变得更好用一些
// @run-at          document-start
// @author          镜花水中捞月
// @homepage        https://github.com/FetchTheMoon
// @icon64          https://cdn.jsdelivr.net/gh/FetchTheMoon/UserScript/LOGO.png
// @updateURL       https://cdn.jsdelivr.net/gh/FetchTheMoon/UserScript/SouthPlusPlus.user.js
// @downloadURL     https://cdn.jsdelivr.net/gh/FetchTheMoon/UserScript/SouthPlusPlus.user.js
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
// 调试代码
//##############################################################
// GM_listValues().forEach(vName => {console.log(vName);GM_deleteValue(vName);});
// return;
// console.log(GM_listValues());

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

function hidePostImage(target=document) {
    let thread_user_post_images = target.querySelectorAll(".t5.t2 .r_one img");

    thread_user_post_images.forEach(img => {
        const emojiPathReg = /images\/post\/smile\//;
        if (!img.getAttribute("src").match(emojiPathReg)) {
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
                // let rect = e.target.getBoundingClientRect();
                // console.log(`鼠标坐标: ${e.x},${e.y}`);
                // console.log(`元素矩阵: l:${rect.left},t:${rect.top},r:${rect.right},b:${rect.bottom}`);
                // console.log(`判定结果: ${(
                //     e.x > rect.left + rect.width * 0.9
                //     && e.x < rect.right
                //     && e.y > rect.top
                //     && e.y < rect.bottom)}`);
                // if (!(
                //     e.x > rect.left + rect.width * 0.9
                //     && e.x < rect.right
                //     && e.y > rect.top
                //     && e.y < rect.bottom )) {
                //     return;
                // }
                e.target.querySelector(".spp-thread-imgs").style.display = "";
                e.target.querySelector(".spp-img-mask-icon-hide").style.display = "none";
                e.target.querySelector(".spp-img-mask-icon-show").style.display = "";
            });
            wrapper.addEventListener("mouseleave", (e) => {
                e.target.querySelector(".spp-thread-imgs").style.display = "none";
                e.target.querySelector(".spp-img-mask-icon-hide").style.display = "";
                e.target.querySelector(".spp-img-mask-icon-show").style.display = "none";
            });

        }
    });
}

function hideUserAvatar(target=document) {
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

function dynamicLoadingThreads() {


    function loadNextPage() {
        // 通过翻页html元素来获得当前的页码和最大页码，之后会主动更新这一部分
        let result = document.querySelector(".pagesone").innerText.match(/Pages: (\d+)\/(\d+)/);
        let currentPageNum = parseInt(result[1]);
        let maxPageNum = parseInt(result[2]);
        console.log(`页数：${currentPageNum}/${maxPageNum}`);

        // 到最后一页了显然就不需要再加载什么了，也不需要将isLoading重置
        if (currentPageNum >= maxPageNum) return

        // fid可以通过全局变量获得
        let url = `/thread.php?fid-${fid}-page-${currentPageNum + 1}.html`;
        console.log(`loading ${url}`);
        // 将地址栏也改变了，这样阅读了帖子倒退回来之后进度不会变
        window.history.pushState({}, 0, url);

        // fetch获得下一页的内容，然后填充到这一页帖子列表底部
        try {
            fetch(url,
                {
                    credentials: 'include',
                    mode: "no-cors"
                }).then(resp => resp.text())
                .then(html => {
                        // fetch得到的新页面填入dummy备用（嗯？感觉在做菜
                        let dummy = document.createElement("html");
                        dummy.innerHTML = html;

                        // 新同学DocumentFragment，相当于一个空白的document
                        // 可以先把下一页的帖子列表先全部扔到这里面
                        let threadsFragment = document.createDocumentFragment();
                        dummy.querySelectorAll(".tr3.t_one").forEach(ele => threadsFragment.appendChild(ele));

                        // 获得本页面最后一个帖子
                        let currentPageThreads = document.querySelectorAll(".tr3.t_one");
                        let currentPageLastThread = currentPageThreads[currentPageThreads.length - 1];
                        // 追加下一页的所有帖子到当前页最后一个帖子的下方
                        currentPageLastThread.parentNode.appendChild(threadsFragment);

                        // 主动更新帖子列表上下方的当前页码数
                        let pagesOld = document.querySelectorAll(".pages");
                        let pagesNew = dummy.querySelectorAll(".pages");
                        for (let i = 0; i < pagesOld.length; i++) {
                            pagesOld[i].parentNode.replaceChild(pagesNew[i], pagesOld[i]);
                        }

                    }
                    // 无论fetch的promise结果是fulfilled或者是rejected，都会执行isLoading=false，允许下一次拉到底部加载
                ).finally(() => isLoading = false)
        } catch (error) {
            alert(`发送请求出错！\n${error}`);
            console.log('Request Failed', error);
        }
    }

    // 防止在页面底部一直滚动会连续加载好几页
    let isLoading;
    document.addEventListener('wheel', (e) => {
        if (
            e.deltaY > 0
            && Math.abs(document.documentElement.scrollHeight - (window.pageYOffset + window.innerHeight)) < 20
            && !isLoading
        ) {
            isLoading = true;
            loadNextPage();

        }

    })


}

function dynamicLoadingPosts() {

    // （DO NOT REPEAT YOURSELF啊
    // （没办法，人菜瘾大，以后重构再说吧
    function loadNextPage() {
        // 帖子内就舒服多了，可以通过page和totalpage来获得当前页和最大页
        let currentPageNum = page;
        let maxPageNum = totalpage;
        console.log(`页数：${currentPageNum}/${maxPageNum}`);

        // 到最后一页了显然就不需要再加载什么了，也不需要将isLoading重置
        if (currentPageNum >= maxPageNum) return

        // tid可以通过全局变量获得
        let url = `/read.php?tid-${tid}-fpage-0-toread--page-${currentPageNum + 1}.html`;

        console.log(`loading ${url}`);
        // 将地址栏也改变了
        window.history.pushState({}, 0, url);

        // fetch获得下一页的内容，然后填充到这一页帖子列表底部
        try {
            fetch(url,
                {
                    credentials: 'include',
                    mode: "no-cors"
                }).then(resp => resp.text())
                .then(html => {
                        // fetch得到的新页面填入dummy备用（嗯？感觉在做菜
                        let dummy = document.createElement("html");
                        dummy.innerHTML = html;
                        if (GM_getValue("hidePostImage")) {
                            hidePostImage(dummy);
                        }
                        if (GM_getValue("hideUserAvatar")) {
                            hideUserAvatar(dummy);
                        }
                        // 新同学DocumentFragment，相当于一个空白的document
                        // 可以先把下一页的帖子列表先全部扔到这里面
                        let postsFragment = document.createDocumentFragment();
                        dummy.querySelectorAll(".t5.t2").forEach(ele => postsFragment.appendChild(ele));

                        // 获得本页面最后一个帖子
                        let currentPagePosts = document.querySelectorAll(".t5.t2");
                        let currentPageLastPost = currentPagePosts[currentPagePosts.length - 1];
                        // 追加下一页的所有帖子到当前页最后一个帖子的下方
                        currentPageLastPost.parentNode.appendChild(postsFragment);

                        // 主动更新帖子列表上下方的当前页码数
                        let pagesOld = document.querySelectorAll(".pages");
                        let pagesNew = dummy.querySelectorAll(".pages");
                        for (let i = 0; i < pagesOld.length; i++) {
                            pagesOld[i].parentNode.replaceChild(pagesNew[i], pagesOld[i]);
                        }
                        // 得给它更新一下。。不然下一次就得不到正确的值了。
                        window.page = currentPageNum + 1
                    }
                    // 无论fetch的promise结果是fulfilled或者是rejected，都会执行isLoading=false，允许下一次拉到底部加载
                ).finally(() => isLoading = false)
        } catch (error) {
            alert(`发送请求出错！\n${error}`);
            console.log('Request Failed', error);
        }
    }

    // 防止在页面底部一直滚动会连续加载好几页
    let isLoading;
    document.addEventListener('wheel', (e) => {
        if (
            e.deltaY > 0
            && Math.abs(document.documentElement.scrollHeight - (window.pageYOffset + window.innerHeight)) < 20
            && !isLoading
        ) {
            isLoading = true;
            loadNextPage();

        }

    })


}

//##############################################################
// 执行入口
//##############################################################
(function () {
    let mainInterval = setInterval(main, 10);
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

        if (GM_getValue("loadingBoughtPostWithoutRefresh") && document.location.href.indexOf("read.php") > -1) {
            loadingBoughtPostWithoutRefresh();
        }
        if (GM_getValue("hidePostImage") && document.location.href.indexOf("read.php") > -1) {
            hidePostImage();
        }
        if (GM_getValue("hideUserAvatar") && document.location.href.indexOf("read.php") > -1) {
            hideUserAvatar();
        }
        if (GM_getValue("dynamicLoadingThreads") && document.location.href.indexOf("thread.php") > -1) {
            dynamicLoadingThreads();
        }
        if (GM_getValue("dynamicLoadingPosts") && document.location.href.indexOf("read.php") > -1) {
            dynamicLoadingPosts();
        }
    }
})()



