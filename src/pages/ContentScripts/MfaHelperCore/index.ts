import $ from 'jquery';
import { v4 as uuidv4 } from 'uuid';
import { AppConfig, AppConfigKeys } from '@/utils/appConfig';
import { waitUntilExisted } from '@/utils/waitUntilExisted';
import { hotpToken, hotpOptions } from '@otplib/core';
import { createDigest } from '@otplib/plugin-crypto-js';

$(window).one('load', async () => {
  // is in MFA Setup mode
  if ((await AppConfig.get(AppConfigKeys.mfaSetupEnabled)) === true) {
    let elements: JQuery;

    // device select page, select the second option `Tablet`
    if ($('#device-question').length !== 0) {
      chrome.runtime.sendMessage({ from: 'mfaHelperCore', action: 'forwardToOverlay', msg: 'showGuideLoading' });
      $('fieldset > label:nth-child(3)').get(0).click();
      $('#continue').get(0).click();
      return;
    }

    // device type select page, select the second option `Android`
    if ($('#device-type-prompt').length !== 0) {
      $('fieldset > label:nth-child(3)').get(0).click();
      $('#continue').get(0).click();
      return;
    }

    // mobile app confirm page
    if ((elements = $('#duo-installed')).length !== 0) {
      elements.get(0).click();
      return;
    }

    // QR code page, activate device
    if ((elements = $('.qr-container > .qr')).length !== 0) {
      const qrData = elements.attr('src').split('qr?value=')[1];
      const url = 'https://' + window.atob(qrData.split('-')[1]) + '/push/v2/activation/' + qrData.split('-')[0];
      const response = await new Promise<Record<string, never>>((resolve) => {
        chrome.runtime.sendMessage({ from: 'mfaHelperCore', action: 'registerMfa', url }, resolve);
      });
      if (response.from !== 'background' || response.action !== 'registerMfa' || response.status !== true) {
        // failed to get secret, terminate MFA Setup
        chrome.runtime.sendMessage({ from: 'mfaHelperCore', action: 'forwardToOverlay', msg: 'hideGuideLoading' });
        chrome.runtime.sendMessage({ from: 'mfaHelperCore', action: 'forwardToOverlay', msg: 'showFailed' });
        await AppConfig.set(AppConfigKeys.mfaSetupEnabled, false);
        return;
      }
      await AppConfig.set(AppConfigKeys.mfaHOTPSecret, response.secret);
      await AppConfig.set(AppConfigKeys.mfaHOTPCount, 0);
      await waitUntilExisted('.qr-container > .ss-check');
      $('#continue').get(0).click();
      return;
    }

    // control panel with new device, configure device
    if ($('div.device-bar.new-device').length !== 0) {
      // rename device
      const deviceName = `MagicBird_${uuidv4().slice(0, 4)}`;
      $('div.device-bar.new-device button.expand-options').trigger('click');
      $('div.device-bar.new-device button.change-device-name').trigger('click');
      $('div.device-bar.new-device div.edit-name-container input').val(deviceName);
      $('div.device-bar.new-device button.edit-submit').trigger('click');
      $('div.device-bar.new-device button.collapse-options').trigger('click').hide();
      await waitUntilExisted('div.message-content > button.btn-dismiss');
      $('div.message-content > button.btn-dismiss').trigger('click');

      // set default auth method
      $('div.select-auto-auth select#factor').val(
        $('div.select-auto-auth select#factor option').get(0).getAttribute('value')
      );
      $('#saved').trigger('click');

      await AppConfig.set(AppConfigKeys.mfaDeviceName, deviceName);
      await AppConfig.set(AppConfigKeys.mfaSetupEnabled, false);
      await AppConfig.set(AppConfigKeys.mfaHelperEnabled, true);
      chrome.runtime.sendMessage({ from: 'mfaHelperCore', action: 'forwardToOverlay', msg: 'hideGuideLoading' });
      chrome.runtime.sendMessage({ from: 'mfaHelperCore', action: 'forwardToOverlay', msg: 'showSucceeded' });
      return;
    }

    // start page, click `Add New Device`
    // lowest priority, because this element always presents
    if ((elements = $('#new-device')).length !== 0 && $('#header-title').length === 0) {
      elements.get(0).click();
      return;
    }
    return;
  }

  // is in MFA Helper mode
  if ((await AppConfig.get(AppConfigKeys.mfaHelperEnabled)) === true) {
    chrome.runtime.sendMessage({ from: 'mfaHelperCore', action: 'forwardToOverlay', msg: 'showMask' });
    const deviceOptions = $('fieldset.device-selector select > option');
    let deviceSet = false;
    for (let i = 0; i < deviceOptions.length; i++) {
      if (deviceOptions.get(i).innerText.startsWith((await AppConfig.get(AppConfigKeys.mfaDeviceName)) as string)) {
        $('fieldset.device-selector select').val(deviceOptions.get(i).getAttribute('value'));
        deviceSet = true;
        break;
      }
    }
    if (!deviceSet) return;
    $('label.remember_me_label_field input').prop('checked', false);
    const passcodeBtn = $('div.passcode-label button#passcode');
    passcodeBtn.trigger('click');
    const token = hotpToken(
      (await AppConfig.get(AppConfigKeys.mfaHOTPSecret)) as string,
      (await AppConfig.get(AppConfigKeys.mfaHOTPCount)) as number,
      hotpOptions({ createDigest, digits: 6 })
    );
    $('div.passcode-label input.passcode-input').val(token);
    passcodeBtn.trigger('click');
    await AppConfig.set(
      AppConfigKeys.mfaHOTPCount,
      (((await AppConfig.get(AppConfigKeys.mfaHOTPCount)) || 0) as number) + 1
    );
    await AppConfig.set(
      AppConfigKeys.mfaTotalCount,
      (((await AppConfig.get(AppConfigKeys.mfaTotalCount)) || 0) as number) + 1
    );
    return;
  }
});
