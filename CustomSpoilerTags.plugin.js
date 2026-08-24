/**
 * @name CustomSpoilerTags
 * @author Skye
 * @version 1.0.0
 * @description Automatically hide messages containing selected keywords.
 */

module.exports = class CustomSpoilerTags {

    constructor() {
        this.keywords =
            BdApi.Data.load("CustomSpoilerTags", "keywords") || [];

        this.observer = null;
        this.processedMessages = new WeakSet();
        this.revealedMessages = new WeakSet();
        this.pendingCheck = false;
    }

    start() {
        this.startObserver();
        this.scanVisibleMessages();
        BdApi.UI.showToast("CustomSpoilerTags loaded!");
    }

    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }

        document
            .querySelectorAll(".custom-spoiler-tags-overlay")
            .forEach(overlay => overlay.remove());

        this.processedMessages = new WeakSet();
        this.revealedMessages = new WeakSet();
    }

    startObserver() {

        this.observer = new MutationObserver((mutations) => {

            let shouldScan = false;

            for (const mutation of mutations) {

                if (mutation.type !== "childList") {
                    continue;
                }

                if (mutation.addedNodes.length > 0) {
                    shouldScan = true;
                    break;
                }
            }

            if (!shouldScan || this.pendingCheck) {
                return;
            }

            this.pendingCheck = true;

            requestAnimationFrame(() => {

                this.pendingCheck = false;

                this.scanVisibleMessages();

            });
        });

        this.observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    scanVisibleMessages() {

        const messages = document.querySelectorAll(
            '[data-list-item-id^="chat-messages"]'
        );

        for (const message of messages) {

            if (!this.isRealMessage(message)) {
                continue;
            }

            if (this.processedMessages.has(message)) {
                continue;
            }

            this.processedMessages.add(message);

            this.checkMessage(message);
        }
    }

    isRealMessage(element) {

        if (!(element instanceof HTMLElement)) {
            return false;
        }

        const id =
            element.getAttribute("data-list-item-id");

        if (!id) {
            return false;
        }

        if (!id.startsWith("chat-messages")) {
            return false;
        }

        const text =
            element.innerText?.trim();

        if (!text) {
            return false;
        }

        return true;
    }

    checkMessage(messageElement) {

        if (this.revealedMessages.has(messageElement)) {
            return;
        }

        const text =
            messageElement.innerText || "";

        if (!text.trim()) {
            return;
        }

        const matchedKeyword =
            this.keywords.find(keyword =>
                text
                    .toLocaleLowerCase()
                    .includes(
                        keyword.toLocaleLowerCase()
                    )
            );

        if (!matchedKeyword) {
            return;
        }

        this.createSpoilerOverlay(
            messageElement
        );
    }

    createSpoilerOverlay(messageElement) {

        if (
            messageElement.querySelector(
                ":scope > .custom-spoiler-tags-overlay"
            )
        ) {
            return;
        }

        const computedStyle =
            window.getComputedStyle(messageElement);

        if (computedStyle.position === "static") {
            messageElement.style.position = "relative";
        }

        const overlay =
            document.createElement("div");

        overlay.className =
            "custom-spoiler-tags-overlay";

        Object.assign(overlay.style, {

            position: "absolute",

            top: "0",
            left: "0",
            right: "0",
            bottom: "0",

            width: "100%",
            height: "100%",

            zIndex: "10",

            background:
                "var(--background-secondary, #2b2d31)",

            display: "flex",

            alignItems: "center",

            justifyContent: "center",

            cursor: "pointer",

            borderRadius: "4px",

            userSelect: "none"
        });

        const content =
            document.createElement("div");

        Object.assign(content.style, {

            textAlign: "center",

            color:
                "var(--text-muted, #b5bac1)",

            fontSize: "14px",

            pointerEvents: "none",

            padding: "10px"
        });

        content.textContent = "MESSAGE HIDDEN. Spoiler keywords detected. CLICK TO REVEAL";

        overlay.appendChild(content);

        /*
         * Reveal the message.
         */

        overlay.addEventListener(
            "click",
            event => {

                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();

                this.revealedMessages.add(
                    messageElement
                );

                overlay.remove();

            },
            true
        );

        messageElement.appendChild(overlay);
    }

    getSettingsPanel() {

        const panel =
            document.createElement("div");

        panel.style.padding = "20px";

        const title =
            document.createElement("h2");

        title.textContent =
            "Keywords";

        panel.appendChild(title);

        const description =
            document.createElement("p");

        description.textContent =
            "Messages containing any keyword below will be hidden.";

        panel.appendChild(description);

        const input =
            document.createElement("input");

        input.type = "text";

        input.placeholder =
            "Enter keyword (case-insensitive)";

        input.style.padding = "8px";

        input.style.width = "300px";

        input.style.marginRight = "8px";

        panel.appendChild(input);

        const addButton =
            document.createElement("button");

        addButton.textContent = "Add";

        addButton.style.padding =
            "8px 15px";

        panel.appendChild(addButton);

        const keywordList =
            document.createElement("div");

        keywordList.style.marginTop =
            "20px";

        panel.appendChild(keywordList);

        const renderKeywords = () => {

            keywordList.innerHTML = "";

            if (this.keywords.length === 0) {

                const empty =
                    document.createElement("p");

                empty.textContent =
                    "No keywords added yet.";

                keywordList.appendChild(empty);

                return;
            }

            this.keywords.forEach(
                (keyword, index) => {

                    const row =
                        document.createElement("div");

                    row.style.marginBottom =
                        "8px";

                    const text =
                        document.createElement("span");

                    text.textContent =
                        keyword;

                    text.style.display =
                        "inline-block";

                    text.style.width =
                        "300px";

                    row.appendChild(text);

                    const removeButton =
                        document.createElement("button");

                    removeButton.textContent =
                        "Remove";

                    removeButton.style.padding =
                        "5px 10px";

                    removeButton.onclick = () => {

                        this.keywords.splice(
                            index,
                            1
                        );

                        BdApi.Data.save(
                            "CustomSpoilerTags",
                            "keywords",
                            this.keywords
                        );

                        renderKeywords();
                    };

                    row.appendChild(
                        removeButton
                    );

                    keywordList.appendChild(
                        row
                    );
                }
            );
        };

        addButton.onclick = () => {

            const keyword =
                input.value.trim();

            if (!keyword) {
                return;
            }

            const alreadyExists =
                this.keywords.some(
                    existing =>
                        existing.toLowerCase() ===
                        keyword.toLowerCase()
                );

            if (alreadyExists) {

                BdApi.UI.showToast(
                    "Keyword already exists.",
                    {
                        type: "error"
                    }
                );

                return;
            }

            this.keywords.push(keyword);

            BdApi.Data.save(
                "CustomSpoilerTags",
                "keywords",
                this.keywords
            );

            input.value = "";

            renderKeywords();

            BdApi.UI.showToast(
                "Keyword added."
            );
        };

        input.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {
                    addButton.click();
                }

            }
        );

        renderKeywords();

        return panel;
    }
};