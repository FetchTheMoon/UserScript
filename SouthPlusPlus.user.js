// ==UserScript==
// @name         Soul++
// @namespace    SoulPlusPlus
// @version      0.1
// @description  魂+论坛功能加强
// @run-at       document-end
// @author       镜花水中捞月
// @match        https://bbs.spring-plus.net/*
// @match        https://bbs.summer-plus.net/*
// @match        https://bbs.soul-plus.net/*
// @match        https://bbs.south-plus.net/*
// @match        https://bbs.north-plus.net/*
// @match        https://bbs.snow-plus.net/* 
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @license      GPL-3.0 License 
// ==/UserScript==
if (window.location.href.indexOf("read.php") > -1) {
    let buyButtons = document.querySelectorAll(".quote.jumbotron>.btn.btn-danger")
    buyButtons.forEach(button => {
        // 获取GET购买地址
        const urlRegex = /location\.href='(.+)'/
        const onclick = button.getAttribute("onclick");
        if (onclick === null) return
        let m = onclick.match(urlRegex)
        if (m === null) return
        let url = m[1];
        // 避免点击按钮的时候跳转，删掉这个属性
        button.setAttribute("onclick", "null");

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
                            alert("购买失败！")
                        }
                        fetch(document.URL, {
                            credentials: 'include',
                            mode: "no-cors"
                        }).then(resp => resp.text())
                            .then(html => {
                                let dummy = document.createElement("html");
                                dummy.innerHTML = html;
                                let purchased = dummy.querySelectorAll(".f14 .blockquote.jumbotron");
                                let notPurchased = document.querySelectorAll(".f14 .blockquote");
                                notPurchased.forEach(ele => {
                                    let p = ele.parentNode;
                                    let postID = p.getAttribute("id");
                                    let replacement = ele;
                                    for (const [k, v] of Object.entries(purchased)) {
                                        if (v.parentNode.getAttribute("id") === postID) {
                                            replacement = v;
                                        }
                                    }
                                    p.replaceChild(replacement, ele);
                                });

                            });

                        btn.style.display = "none";

                    });

            } catch (error) {
                alert(`发送请求出错，购买失败！\n${error}`)
                console.log('Request Failed', error);
            }
        })

        button.addEventListener("click", customPurchase);
    });
}
