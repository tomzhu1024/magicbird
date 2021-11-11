chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // create tab request from MFA Helper Overlay
  if (message.from === 'mfaHelperOverlay' && message.action === 'clearBrowserData') {
    chrome.tabs.create({
      url: 'chrome://settings/clearBrowserData',
    });
    return;
  }

  // register MFA request from MFA Helper Core
  if (message.from === 'mfaHelperCore' && message.action === 'registerMfa') {
    fetch(message.url, { method: 'POST' }).then(async (response) => {
      let data;
      if (!response.ok || (data = JSON.parse(await response.text())).stat !== 'OK' || !data.response?.hotp_secret) {
        sendResponse({
          from: 'background',
          action: 'registerMfa',
          status: false,
        });
        return;
      }
      sendResponse({
        from: 'background',
        action: 'registerMfa',
        status: true,
        secret: data.response.hotp_secret,
      });
      return;
    });
    return true;
  }

  // forward message request from MFA Helper Core to MFA Helper
  if (message.from === 'mfaHelperCore' && message.action === 'forwardToOverlay') {
    chrome.tabs.sendMessage(sender.tab.id, {
      from: 'background',
      action: 'forwardFromCore',
      msg: message.msg,
    });
    return;
  }
});
