import * as React from 'react';
import { useState, useEffect, ReactNode } from 'react';
import * as ReactDOM from 'react-dom';
import { Button, Space, Switch, Statistic, Card } from 'antd';
import { UnlockOutlined, ThunderboltOutlined, CaretRightOutlined, SettingOutlined } from '@ant-design/icons';
import { useDidMount } from '@/utils/useDidMount';
import { AppConfig, AppConfigKeys } from '@/utils/appConfig';
import style from './index.module.less';
import appLogo from '@/../public/icon_512_512.png';

type ToggleCardProps = {
  icon: ReactNode;
  title: string;
  disabled: boolean;
  value: boolean;
  onChanged: (newValue: boolean) => void;
};

const ToggleCard: React.FC<ToggleCardProps> = (props) => (
  <Card>
    <Space direction="vertical" style={{ width: '100%' }}>
      <div className={style.flexBox}>
        <Space>
          {props.icon}
          <span>{props.title}</span>
        </Space>
        <Switch disabled={props.disabled} checked={props.value} onChange={props.onChanged} />
      </div>
      {props.children !== undefined && props.children}
    </Space>
  </Card>
);

const App: React.FC = () => {
  const didMount = useDidMount();
  const [mfaHelperEnabled, setMfaHelperEnabled] = useState<boolean>(false);
  const [mfaNeedSetup, setMfaNeedSetup] = useState<boolean>(false);
  const [mfaCount, setMfaCount] = useState<number>(0);
  const [enrollmentHelperEnabled, setEnrollmentHelperEnabled] = useState<boolean>(false);

  // run on first render
  useEffect(() => {
    (async () => {
      const mfaHelperEnabled = await AppConfig.get(AppConfigKeys.mfaHelperEnabled);
      const mfaDeviceName = await AppConfig.get(AppConfigKeys.mfaDeviceName);
      const mfaHOTPSecret = await AppConfig.get(AppConfigKeys.mfaHOTPSecret);
      const mfaHOTPCount = await AppConfig.get(AppConfigKeys.mfaHOTPCount);
      const mfaTotalCount = await AppConfig.get(AppConfigKeys.mfaTotalCount);
      const enrollmentHelperEnabled = await AppConfig.get(AppConfigKeys.enrollmentHelperEnabled);

      setMfaNeedSetup(!mfaDeviceName || !mfaHOTPSecret || mfaHOTPCount === undefined);
      setMfaHelperEnabled((mfaHelperEnabled || false) as boolean);
      setMfaCount((mfaTotalCount || 0) as number);
      setEnrollmentHelperEnabled((enrollmentHelperEnabled || false) as boolean);
    })();
  }, []);

  // run when state changed
  useEffect(() => {
    if (!didMount) return;
    AppConfig.set(AppConfigKeys.mfaHelperEnabled, mfaHelperEnabled);
  }, [mfaHelperEnabled]);
  useEffect(() => {
    if (!didMount) return;
    AppConfig.set(AppConfigKeys.enrollmentHelperEnabled, enrollmentHelperEnabled);
  }, [enrollmentHelperEnabled]);

  return (
    <div className={style.app}>
      <div className={style.header}>
        <img className={style.icon} src={appLogo} draggable={false} />
        <span className={style.text}>{chrome.i18n.getMessage('extName')}</span>
      </div>
      <div className={style.cardsContainer}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <ToggleCard
            icon={<UnlockOutlined style={{ color: '#055d04' }} />}
            title={chrome.i18n.getMessage('mfaHelper')}
            disabled={mfaNeedSetup}
            value={mfaHelperEnabled}
            onChanged={(value) => setMfaHelperEnabled(value)}
          >
            <Card bodyStyle={{ paddingBottom: 0 }}>
              {mfaNeedSetup ? (
                <>
                  <span className={style.miniHint}>{chrome.i18n.getMessage('mfaHelperNeedSetup')}</span>
                  <Button
                    type="primary"
                    icon={<CaretRightOutlined />}
                    block
                    onClick={async () => {
                      await AppConfig.set(AppConfigKeys.mfaSetupEnabled, true);
                      chrome.tabs.create({
                        url: 'https://start.nyu.edu/',
                      });
                    }}
                  >
                    {chrome.i18n.getMessage('setup')}
                  </Button>
                  <Button
                    type="link"
                    block
                    style={{
                      fontSize: '12px',
                    }}
                    onClick={() => {
                      chrome.tabs.create({
                        url: 'manualMfaSetup.html',
                      });
                    }}
                  >
                    Setup with E-Mail...
                  </Button>
                </>
              ) : (
                <Statistic title={chrome.i18n.getMessage('numberOfMfaCompleted')} value={mfaCount} />
              )}
            </Card>
          </ToggleCard>
          <ToggleCard
            icon={<ThunderboltOutlined style={{ color: '#57068c' }} />}
            title={chrome.i18n.getMessage('enrollmentHelper')}
            disabled={false}
            value={enrollmentHelperEnabled}
            onChanged={setEnrollmentHelperEnabled}
          />
          {/*<Button*/}
          {/*  icon={<SettingOutlined />}*/}
          {/*  block*/}
          {/*  onClick={() => {*/}
          {/*    chrome.tabs.create({*/}
          {/*      url: 'options.html',*/}
          {/*    });*/}
          {/*  }}*/}
          {/*>*/}
          {/*  {chrome.i18n.getMessage('moreOptions')}*/}
          {/*</Button>*/}
        </Space>
      </div>
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById('root'));

/* debug:start */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
if (module.hot) module.hot.accept();
/* debug:end */
