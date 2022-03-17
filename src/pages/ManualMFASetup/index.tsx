import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { Helmet } from 'react-helmet';
import { Layout, Menu, Breadcrumb, Input, Button, message, Space, Steps } from 'antd';
import style from './index.module.less';
import appLogo from '@/../public/icon_512_512.png';
import { useState } from 'react';
import { AppConfig, AppConfigKeys } from '@/utils/appConfig';
import { isCaughtException } from 'mobx/dist/core/derivation';

const App: React.FC = () => {
  const [code, setCode] = useState<string>('');
  const [registerStep, setRegisterStep] = useState<number>(NaN);

  const register = async () => {
    if (code === '') {
      message.error('Code cannot be empty!');
      return;
    }
    let url;
    try {
      url = 'https://' + window.atob(code.split('-')[1]) + '/push/v2/activation/' + code.split('-')[0];
    } catch {
      message.error('Failed to parse code. Check it again.');
      return;
    }
    setRegisterStep(0);
    fetch(url, { method: 'POST' }).then(async (response) => {
      setRegisterStep(1);
      let data;
      if (!response.ok || (data = JSON.parse(await response.text())).stat !== 'OK' || !data.response?.hotp_secret) {
        message.error(
          `Failed to register: ${
            data === undefined ? (data = JSON.parse(await response.text())).stat.message : data.message
          }`
        );
        return;
      }
      setRegisterStep(2);
      const secret = data.response.hotp_secret;
      console.log(`Fetched HOTP secret: ${secret}`);
      await AppConfig.set(AppConfigKeys.mfaHOTPSecret, secret);
      await AppConfig.set(AppConfigKeys.mfaHOTPCount, 0);
      await AppConfig.set(AppConfigKeys.mfaDeviceName, 'Android');
      await AppConfig.set(AppConfigKeys.mfaHelperEnabled, true);
      message.success('Registered successfully.');
      return;
    });
  };

  return (
    <>
      <Helmet>
        <title>Setup MFA Manually</title>
      </Helmet>
      <Layout style={{ height: '100%' }}>
        <Layout.Header>
          <div className={style.headerLogo}>
            <img src={appLogo} draggable={false} />
            <span>MFA Setup</span>
          </div>
        </Layout.Header>
        <Layout.Content style={{ margin: '25px 20px' }}>
          <div className={style.borderedBox}>
            <span style={{ lineHeight: '25px' }}>
              To configure MFA Helper manually:
              <ol>
                <li>Open the MFA page;</li>
                <li>
                  Click <strong>My Settings & Devices</strong> on the left side;
                </li>
                <li>Proceed and go through MFA;</li>
                <li>
                  Click <strong>Add another device</strong>;
                </li>
                <li>
                  Choose <strong>Tablet (iPad, Nexus 7, etc.)</strong>;
                </li>
                <li>
                  Choose <strong>Android</strong>;
                </li>
                <li>
                  Click <strong>I have Duo Mobile installed</strong>;
                </li>
                <li>
                  Click <strong>Email me an activation link instead.</strong>;
                </li>
                <li>Enter your email address;</li>
                <li>
                  Click <strong>Send email</strong>;
                </li>
                <li>Check your inbox and open the link in the email;</li>
                <li>
                  Copy the code and paste in the following input box, the code should look like this:
                  XXXXXXXXXXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
                </li>
                <li>
                  Click <strong>Submit</strong> button.
                </li>
              </ol>
            </span>
            <Input.Group compact style={{ marginTop: '20px' }}>
              <Input
                style={{ width: 'calc(100% - 100px)' }}
                placeholder="Paste the code here"
                value={code}
                onChange={(event) => setCode(event.target.value)}
              />
              <Button style={{ width: '100px' }} type="primary" onClick={register}>
                Submit
              </Button>
            </Input.Group>
            <Steps direction="vertical" size="small" current={registerStep} style={{ marginTop: '25px' }}>
              <Steps.Step title="Sending request to server..." />
              <Steps.Step title="Receiving response from server..." />
              <Steps.Step title="Saving MFA data..." />
              <Steps.Step title="Completed!" />
            </Steps>
            <span style={{ marginTop: '25px' }}>
              If everything went on well, you will see a success message, and the <strong>Continue</strong> button will
              become clickable, click it and MFA Helper configuration is completed!
            </span>
          </div>
        </Layout.Content>
      </Layout>
    </>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));

/* debug:start */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (module.hot) module.hot.accept();
/* debug:end */
