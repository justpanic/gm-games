import html2canvas from "html2canvas";
import { fetchWrapper } from "../../common";
import { logEvent } from ".";

const takeScreenshot = async () => {
    const contentEl = document.getElementById("actual-content");
    if (!contentEl) {
        throw new Error("Missing DOM element #actual-content");
    }

    // Add watermark
    const watermark = document.createElement("div");
    const navbarBrands = document.getElementsByClassName("navbar-brand");
    if (navbarBrands.length === 0) {
        return;
    }
    const navbarBrandParent = navbarBrands[0].parentElement;
    if (!navbarBrandParent) {
        return;
    }
    watermark.innerHTML = `<nav class="navbar navbar-default"><div class="container-fluid"><div class="navbar-header">${String(
        navbarBrandParent.innerHTML,
    )}</div><p class="navbar-text navbar-right" style="color: #000; font-weight: bold">Play your own league free at basketball-gm.com</p></div></nav>`;
    contentEl.insertBefore(watermark, contentEl.firstChild);
    contentEl.style.padding = "8px";

    // Add notifications
    const notifications = document
        .getElementsByClassName("notification-container")[0]
        .cloneNode(true);
    notifications.classList.remove("notification-container");
    for (let i = 0; i < notifications.childNodes.length; i++) {
        // Otherwise screeenshot is taken before fade in is complete
        const el = notifications.children[0];
        if (el.classList && typeof el.classList.remove === "function") {
            el.classList.remove("notification-fadein");
        }
    }
    contentEl.appendChild(notifications);

    const canvas = await html2canvas(contentEl, {
        background: "#fff",
    });

    // Remove watermark
    contentEl.removeChild(watermark);
    contentEl.style.padding = "";

    // Remove notifications
    contentEl.removeChild(notifications);

    logEvent({
        type: "screenshot",
        text: `Uploading your screenshot to Imgur...`,
        saveToDb: false,
        showNotification: true,
        persistent: false,
        extraClass: "notification-primary",
    });

    try {
        const data = await fetchWrapper({
            url: "https://imgur-apiv3.p.mashape.com/3/image",
            method: "POST",
            headers: {
                Authorization: "Client-ID c2593243d3ea679",
                "X-Mashape-Key":
                    "H6XlGK0RRnmshCkkElumAWvWjiBLp1ItTOBjsncst1BaYKMS8H",
            },
            data: {
                image: canvas.toDataURL().split(",")[1],
            },
        });

        if (data.data.error) {
            console.log(data.data.error);
            throw new Error(data.data.error.message);
        }

        const url = `http://imgur.com/${data.data.id}`;
        const encodedURL = window.encodeURIComponent(url);

        logEvent({
            type: "screenshot",
            text: `<p><a href="${url}" target="_blank">Click here to view your screenshot.</a></p>
<a href="https://www.reddit.com/r/BasketballGM/submit?url=${encodedURL}">Share on Reddit</a><br>
<a href="https://twitter.com/intent/tweet?url=${encodedURL}&via=basketball_gm">Share on Twitter</a>`,
            saveToDb: false,
            showNotification: true,
            persistent: true,
            extraClass: "notification-primary",
        });
    } catch (err) {
        console.log(err);
        let errorMsg;
        if (
            err &&
            err.responseJSON &&
            err.responseJSON.error &&
            err.responseJSON.error.message
        ) {
            errorMsg = `Error saving screenshot. Error message from Imgur: "${
                err.responseJSON.error.message
            }"`;
        } else if (err.message) {
            errorMsg = `Error saving screenshot. Error message from Imgur: "${
                err.message
            }"`;
        } else {
            errorMsg = "Error saving screenshot.";
        }
        logEvent({
            type: "error",
            text: errorMsg,
            saveToDb: false,
        });
    }
};

export default takeScreenshot;