let sortDomain = document.getElementById('sortDomain');
let groupTab = document.getElementById('groupTab');
let sortYt = document.getElementById('sortYt');

sortDomain.addEventListener("click", async () => {
    chrome.tabs.query({
        currentWindow: true,
        groupId: -1
    }, tabs => {
        const collator = new Intl.Collator();
        tabs.sort((a, b) => collator.compare(a.url, b.url));
        for (const tab of tabs) {
            chrome.tabs.move(tab.id, {
                index: -1
            });
        }
    });

});

groupTab.addEventListener("click", async () => {
    chrome.tabs.query({
        currentWindow: true
    }, async tabs => {
        const hosts = [...new Set(tabs.map(tab => new URL(tab.url).hostname))];
        for (const host of hosts) {
            const group = await chrome.tabs.group({
                tabIds: tabs.filter(tab => new URL(tab.url).hostname === host).map(tab => tab.id)
            });
            await chrome.tabGroups.update(group, {
                title: host
            });
        }
    });
});

sortYt.addEventListener("click", async () => {
    const tabs = await chrome.tabs.query({
        currentWindow: true,
        url: "*://www.youtube.com/watch?v=*"
    });
    let promises = [];
    for (var i = 0; i < tabs.length; i++) {
        promises.push(createListEntry(tabs[i].id, i));
    }
    const promisesFinished = Promise.all(promises);
    const sortedList = (await promisesFinished).sort((a, b) => {
        return a.vidLength - b.vidLength;
    });
    for (let i = 0; i < sortedList.length; i++) {
        await chrome.tabs.move(sortedList[i].tabId, {
            index: -1
        });
    }
    async function createListEntry(tabId, i) {
        return new Promise((resolve) => {
            chrome.scripting.executeScript({
                    target: {
                        tabId: tabId
                    },
                    func: getYouTubeLength,
                    args: [tabId]
                },
                (returnValue) => {
                    resolve(returnValue[0].result);
                }
            );
        });
    }
    function getYouTubeLength(tab) {
        return {
            tabId: tab,
            vidLength: document.querySelector("video").duration
        };
    }
});