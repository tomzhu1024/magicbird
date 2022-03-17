import $ from 'jquery';
import * as React from 'react';
import { useEffect, useState } from 'react';
import * as ReactDOM from 'react-dom';
import { Button, Popover, Modal } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { AppConfig, AppConfigKeys } from '@/utils/appConfig';
import { resolveAsterisks } from '@/utils/resolveAsterisk';

const enlargeBox = (props: BoxDimension, padding: number): BoxDimension => ({
  left: props.left - padding,
  top: props.top - padding,
  width: props.width + 2 * padding,
  height: props.height + 2 * padding,
});

type LoadingProps = {
  isLoading: boolean;
  loadingHint: string;
};

const Loading: React.FC<LoadingProps> = (props) => (
  <div
    style={{
      top: '50%',
      left: '50%',
      maxWidth: '70%',
      maxHeight: '70%',
      position: 'relative',
      transform: 'translate(-50%, -50%)',
      textAlign: 'center',
      opacity: props.isLoading ? 1 : 0,
      transition: 'opacity 0.5s ease-in-out',
    }}
  >
    <p>
      <img
        src={`chrome-extension://${chrome.runtime.id}/loading_animation.gif`}
        style={{ width: '75%', maxWidth: '400px', borderRadius: '25px', opacity: '80%' }}
        draggable={false}
      />
    </p>
    {props.loadingHint && (
      <p
        style={{
          fontSize: '16px',
          fontWeight: 700,
          color: '#ffffff',
        }}
      >
        {props.loadingHint}
      </p>
    )}
  </div>
);

type BoxDimension = {
  left: number;
  top: number;
  width: number;
  height: number;
};
type HighlightProps = BoxDimension & {
  visible: boolean;
  isLoading: boolean;
  loadingHint: string;
};

const Highlight: React.FC<HighlightProps> = (props) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: props.left,
        top: props.top,
        width: props.width,
        height: props.height,
        boxShadow: '0 0 5000px 5000px rgba(0,0,0,45%)',
        border: '3px solid rgba(200,200,200,90%)',
        borderRadius: '10px',
        opacity: props.visible ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out, background-color 0.5s ease-in-out',
        backgroundColor: props.isLoading ? 'rgba(0,0,0,45%)' : 'rgba(0,0,0,0)',
        pointerEvents: 'none',
      }}
    >
      <Loading isLoading={props.isLoading} loadingHint={props.loadingHint} />
    </div>
  );
};

const App: React.FC = () => {
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [isGuideLoading, setIsGuideLoading] = useState<boolean>(false);
  const [guidePosition, setGuidePosition] = useState<BoxDimension>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [guideTitle, setGuideTitle] = useState<string>('');
  const [guideContent, setGuideContent] = useState<string>('');
  const [showMask, setShowMask] = useState<boolean>(false);

  const highlightElement = (elements: JQuery, title: string, content: string): void => {
    const { left, top } = elements.offset();
    const width = elements.width();
    const height = elements.height();
    setGuidePosition(enlargeBox({ left, top, width, height }, 5));
    setGuideTitle(title);
    setGuideContent(content);
    setShowGuide(true);
  };
  const exitSetup = (): void => {
    setShowGuide(false);
    AppConfig.set(AppConfigKeys.mfaSetupEnabled, false);
  };
  const showPageNotSupportedErr = () => {
    Modal.confirm({
      title: <span style={{ fontWeight: 700 }}>{chrome.i18n.getMessage('somethingGoesWrong')}</span>,
      content: (
        <>
          <p>{chrome.i18n.getMessage('mfaSetupDontSupport')}</p>
          <ul>
            <li>{chrome.i18n.getMessage('clickBackBtn')}</li>
            <li>
              <a onClick={() => chrome.runtime.sendMessage({ from: 'mfaHelperOverlay', action: 'clearBrowserData' })}>
                {chrome.i18n.getMessage('clearBrowserData')}
              </a>
            </li>
          </ul>
          <p>{chrome.i18n.getMessage('mayExitSetup')}</p>
        </>
      ),
      okText: chrome.i18n.getMessage('ok'),
      cancelText: chrome.i18n.getMessage('exitSetup'),
      onCancel: exitSetup,
    });
  };

  useEffect(() => {
    $(window).on('load', async () => {
      // style fix
      // fix body background color on `shibboleth.nyu.edu`
      if (window.location.host === 'shibboleth.nyu.edu') {
        $('body').css('background-color', '#330662');
      }

      // is in MFA Setup mode
      if ((await AppConfig.get(AppConfigKeys.mfaSetupEnabled)) === true) {
        // register listener
        chrome.runtime.onMessage.addListener((message) => {
          // forwarded message from MFA Helper Core
          if (message.from === 'background' && message.action === 'forwardFromCore') {
            // show succeeded message
            if (message.msg === 'showSucceeded') {
              setShowGuide(false);
              Modal.success({
                title: chrome.i18n.getMessage('congratulations'),
                content: chrome.i18n.getMessage('mfaSetupSucceeded'),
                okText: chrome.i18n.getMessage('ok'),
              });
              return;
            }

            // show failed message
            if (message.msg === 'showFailed') {
              setShowGuide(false);
              Modal.error({
                title: chrome.i18n.getMessage('somethingGoesWrong'),
                content: chrome.i18n.getMessage('mfaSetupFailed'),
                okText: chrome.i18n.getMessage('ok'),
              });
              return;
            }

            // show guide loading
            if (message.msg === 'showGuideLoading') {
              setIsGuideLoading(true);
              return;
            }

            // hide guide loading
            if (message.msg === 'hideGuideLoading') {
              setIsGuideLoading(false);
              return;
            }
            return;
          }
        });

        let elements: JQuery;

        // login page on start.nyu.edu
        if ((elements = $('#Button_Login')).length !== 0) {
          highlightElement(elements, chrome.i18n.getMessage('tip'), chrome.i18n.getMessage('clickLogin'));
          return;
        }

        // username / password page on auth.nyu.edu
        if ((elements = $('#loginForm')).length !== 0) {
          highlightElement(elements, chrome.i18n.getMessage('tip'), chrome.i18n.getMessage('enterNetIdPassword'));
          return;
        }

        // MFA page on auth.nyu.edu
        if ((elements = $('#duo_iframe')).length !== 0) {
          highlightElement(elements, chrome.i18n.getMessage('tip'), chrome.i18n.getMessage('completeMfa'));
          return;
        }

        // control panel page on start.nyu.edu
        if ((elements = $('#LogoutButton')).length !== 0) {
          highlightElement(elements, chrome.i18n.getMessage('tip'), chrome.i18n.getMessage('clickLogout'));
          return;
        }

        // nothing matched
        showPageNotSupportedErr();
        return;
      }

      // is in MFA Helper mode
      // is in MFA Setup mode
      if ((await AppConfig.get(AppConfigKeys.mfaHelperEnabled)) === true) {
        // register listener
        chrome.runtime.onMessage.addListener((message) => {
          // forwarded message from MFA Helper Core
          if (message.from === 'background' && message.action === 'forwardFromCore') {
            // show mask
            if (message.msg === 'showMask') {
              setShowMask(true);
              return;
            }

            // hide mask
            if (message.msg === 'hideMask') {
              setShowMask(false);
              return;
            }
            return;
          }
        });
        return;
      }
    });
  }, []);

  return (
    <>
      <Popover
        visible={showGuide}
        title={
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '16px', fontWeight: 700 }}>{guideTitle}</span>
            <Button shape="round" size="small" icon={<CloseOutlined />} onClick={exitSetup}>
              {chrome.i18n.getMessage('exitSetup')}
            </Button>
          </div>
        }
        content={<div style={{ width: '200px' }}>{resolveAsterisks(guideContent)}</div>}
        zIndex={999}
      >
        <Highlight
          visible={showGuide}
          isLoading={isGuideLoading}
          loadingHint={chrome.i18n.getMessage('isSettingUp')}
          {...guidePosition}
        />
      </Popover>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,45%)',
          opacity: showMask ? 1 : 0,
          transition: 'opacity 0.5s ease-in-out',
          pointerEvents: 'none',
        }}
      >
        <Loading isLoading={true} loadingHint={chrome.i18n.getMessage('isAutomating')} />
      </div>
    </>
  );
};

$('body').append(
  '<div id="mfaHelperOverlay_container" style="position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 999" />'
);
ReactDOM.render(<App />, document.getElementById('mfaHelperOverlay_container'));
