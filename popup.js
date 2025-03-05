const sortDomain = document.getElementById("sortDomain");
const groupTab = document.getElementById("groupTab");
const sortYt = document.getElementById("sortYt");
const ungroupTabs = document.getElementById("ungroupTabs");

sortDomain.addEventListener("click", async () => {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true, groupId: -1 });
    const collator = new Intl.Collator();
    tabs.sort((a, b) => collator.compare(a.url, b.url));

    // Move all tabs in parallel
    await Promise.all(
      tabs.map((tab) => chrome.tabs.move(tab.id, { index: -1 }))
    );
  } catch (error) {
    console.error("Error sorting domains:", error);
  }
});

groupTab.addEventListener("click", async () => {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const hostMap = new Map();

    // Group tabs by core domain name
    tabs.forEach((tab) => {
      const hostname = new URL(tab.url).hostname;
      const coreDomain = getCoreDomain(hostname); // Extract core domain
      if (!hostMap.has(coreDomain)) {
        hostMap.set(coreDomain, []);
      }
      hostMap.get(coreDomain).push(tab.id);
    });

    // Create groups and set titles
    for (const [coreDomain, tabIds] of hostMap.entries()) {
      const groupId = await chrome.tabs.group({ tabIds });
      await chrome.tabGroups.update(groupId, { title: coreDomain });
    }
  } catch (error) {
    console.error("Error grouping tabs:", error);
  }
});

// Function to extract the core domain name (without extensions or subdomains)
function getCoreDomain(hostname) {
  // Remove subdomains and domain extensions
  const parts = hostname.split(".");
  if (parts.length > 2) {
    // If there are subdomains, return the second-to-last part (e.g., "google" from "www.google.com")
    return parts[parts.length - 2];
  }
  // If no subdomains, return the first part (e.g., "example" from "example.com")
  return parts[0];
}

sortYt.addEventListener("click", async () => {
  try {
    const tabs = await chrome.tabs.query({
      currentWindow: true,
      url: "*://www.youtube.com/watch?v=*",
    });

    // Get video lengths in parallel
    const tabDetails = await Promise.all(
      tabs.map((tab) => getYouTubeLength(tab.id))
    );

    // Sort by video length
    tabDetails.sort((a, b) => a.vidLength - b.vidLength);

    // Move tabs in order
    for (const { tabId } of tabDetails) {
      await chrome.tabs.move(tabId, { index: -1 });
    }
  } catch (error) {
    console.error("Error sorting YouTube tabs:", error);
  }
});

ungroupTabs.addEventListener("click", async () => {
  try {
    const tabs = await chrome.tabs.query({ currentWindow: true });

    // Ungroup all tabs
    for (const tab of tabs) {
      if (tab.groupId !== -1) {
        await chrome.tabs.ungroup(tab.id);
      }
    }
  } catch (error) {
    console.error("Error ungrouping tabs:", error);
  }
});

async function getYouTubeLength(tabId) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: () => document.querySelector("video")?.duration || 0,
      },
      (results) => {
        resolve({ tabId, vidLength: results[0].result });
      }
    );
  });
}
