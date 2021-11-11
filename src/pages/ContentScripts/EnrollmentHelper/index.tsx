import $ from 'jquery';
import * as React from 'react';
import { ReactNode, useEffect, useRef, useState } from 'react';
import * as ReactDOM from 'react-dom';
import { Button, Space, TimePicker, Tag, Modal, DatePicker } from 'antd';
import {
  SyncOutlined,
  MinusCircleOutlined,
  MinusOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import moment, { Moment } from 'moment';
import { resolveAsterisks } from '@/utils/resolveAsterisk';
import { AppConfig, AppConfigKeys } from '@/utils/appConfig';

const Helper: React.FC<{
  setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}> = (props) => {
  const [status, setStatus] = useState<'idle' | 'waiting' | 'working' | 'completed'>('idle');
  const currentTimeRef = useRef<HTMLParagraphElement>();
  const [date, setDate] = useState<Moment>(moment());
  const [time, setTime] = useState<Moment>(moment());

  const tagIcon: Record<'idle' | 'waiting' | 'working' | 'completed', ReactNode> = {
    idle: <MinusCircleOutlined />,
    waiting: <ClockCircleOutlined />,
    working: <SyncOutlined spin />,
    completed: <CheckCircleOutlined />,
  };
  const tagColor: Record<'idle' | 'waiting' | 'working' | 'completed', string> = {
    idle: '#9d9d9d',
    waiting: '#62dac8',
    working: '#ff6315',
    completed: '#87d068',
  };
  const tagText: Record<'idle' | 'waiting' | 'working' | 'completed', string> = {
    idle: chrome.i18n.getMessage('enrollmentIdleStatus'),
    waiting: chrome.i18n.getMessage('enrollmentWaitingStatus'),
    working: chrome.i18n.getMessage('enrollmentWorkingStatus'),
    completed: chrome.i18n.getMessage('enrollmentCompletedStatus'),
  };
  let timerId: number;
  const onStartBtnClicked = () => {
    // data and time is empty
    if (!date || !time) {
      Modal.error({
        title: chrome.i18n.getMessage('error'),
        content: chrome.i18n.getMessage('enrollmentEmptyTime'),
        okText: chrome.i18n.getMessage('ok'),
      });
      return;
    }

    // data and time is earlier than now
    const targetTime = moment(date.format('YYYY-MM-DD') + ' ' + time.format('HH:mm:ss'), 'YYYY-MM-DD HH:mm:ss');
    if (targetTime.diff(moment()) <= 0) {
      Modal.error({
        title: chrome.i18n.getMessage('error'),
        content: chrome.i18n.getMessage('enrollmentInvalidTime'),
        okText: chrome.i18n.getMessage('ok'),
      });
      return;
    }

    const iframe = $('#lbFrameContent');
    // not in cart page
    if ($('a#DERIVED_REGFRM1_LINK_ADD_ENRL', iframe.contents()).length === 0) {
      Modal.error({
        title: chrome.i18n.getMessage('error'),
        content: resolveAsterisks(chrome.i18n.getMessage('enrollmentPageNotSupported')),
        okText: chrome.i18n.getMessage('ok'),
      });
      return;
    }

    // no course selected
    const selectedCourses: Array<string> = [];
    const items = $('div[id="win0divSSR_REGFORM_VWgridc-right$0"] div.ps_box-dropdown', iframe.contents());
    for (let i = 0; i < items.length; i++) {
      if ($('select', items.get(i)).val() === 'Y') {
        selectedCourses.push($('label', items.get(i)).text());
      }
    }
    if (selectedCourses.length === 0) {
      Modal.error({
        title: chrome.i18n.getMessage('error'),
        content: chrome.i18n.getMessage('enrollmentNoSelectedCourse'),
        okText: chrome.i18n.getMessage('ok'),
      });
      return;
    }

    Modal.confirm({
      title: chrome.i18n.getMessage('confirm'),
      icon: <ExclamationCircleOutlined />,
      content: (
        <>
          <p>{chrome.i18n.getMessage('enrollmentStartConfirmPrefix')}</p>
          <ul>
            {selectedCourses.map((item, index) => (
              <li key={index} style={{ fontWeight: 700 }}>
                {(item.match(/Select Class: (.*) \?/) || [])[1] || ''}
              </li>
            ))}
          </ul>
          <p>{chrome.i18n.getMessage('enrollmentStartConfirmDataTime')}</p>
          <p style={{ fontWeight: 700 }}>{targetTime.format('YYYY-MM-DD HH:mm:ss')}</p>
        </>
      ),
      okText: chrome.i18n.getMessage('ok'),
      cancelText: chrome.i18n.getMessage('cancel'),
      onOk: () => {
        setTimeout(async () => {
          setStatus('working');
          const iframe = $('#lbFrameContent');
          const simulateClick = (selector: JQuery.Selector) => {
            const btn = $(selector, iframe.contents());
            btn.attr('onclick', btn.attr('href'));
            btn.removeAttr('href');
            btn.get(0).click();
          };
          simulateClick('a#DERIVED_REGFRM1_LINK_ADD_ENRL');
          let id: number;
          await new Promise<void>((resolve) => {
            id = window.setInterval(() => {
              if ($('a#DERIVED_REGFRM1_SSR_PB_SUBMIT', iframe.contents()).length !== 0) resolve();
            }, 10);
          });
          window.clearInterval(id);
          simulateClick('a#DERIVED_REGFRM1_SSR_PB_SUBMIT');
          setStatus('completed');
        }, targetTime.diff(moment()));
        setStatus('waiting');
      },
    });
  };
  const onCancelBtnClicked = () => {
    Modal.confirm({
      title: chrome.i18n.getMessage('confirm'),
      icon: <ExclamationCircleOutlined />,
      content: chrome.i18n.getMessage('enrollmentCancelConfirmDesc'),
      okText: chrome.i18n.getMessage('ok'),
      cancelText: chrome.i18n.getMessage('cancel'),
      onOk: () => {
        clearTimeout(timerId);
        setStatus('idle');
      },
    });
  };

  // run on first render
  useEffect(() => {
    const id = window.setInterval(() => {
      currentTimeRef.current.innerText = moment().format('YYYY-MM-DD HH:mm:ss.SSS');
    }, 50);
    return () => window.clearInterval(id);
  });

  return (
    <Space direction="vertical" style={{ padding: '6px 20px 6px 6px', width: '100%' }}>
      <Space style={{ width: '100%' }}>
        <Button shape="circle" size="small" icon={<MinusOutlined />} onClick={() => props.setIsCollapsed(true)} />
        <Tag icon={tagIcon[status]} color={tagColor[status]}>
          {tagText[status]}
        </Tag>
      </Space>
      <Space direction="vertical" style={{ padding: '0 0 8px 8px', width: '100%' }}>
        <span>{chrome.i18n.getMessage('currentTime')}</span>
        <span style={{ fontWeight: 600 }} ref={currentTimeRef} />
        <span>{chrome.i18n.getMessage('enrollmentTimePicker')}</span>
        <DatePicker
          size="small"
          style={{ width: '100%' }}
          format="YYYY-MM-DD"
          value={date}
          onChange={(val) => setDate(val)}
          disabled={status !== 'idle' && status !== 'completed'}
          placeholder={chrome.i18n.getMessage('enrollmentDatePickerPlaceholder')}
        />
        <TimePicker
          size="small"
          style={{ width: '100%' }}
          format="HH:mm:ss"
          value={time}
          onChange={(val) => setTime(val)}
          disabled={status !== 'idle' && status !== 'completed'}
          placeholder={chrome.i18n.getMessage('enrollmentTimePickerPlaceholder')}
        />
        <div style={{ marginTop: '5px' }}>
          {(status === 'idle' || status === 'completed') && (
            <Button type="primary" onClick={onStartBtnClicked}>
              {chrome.i18n.getMessage('start')}
            </Button>
          )}
          {status === 'waiting' && <Button onClick={onCancelBtnClicked}>{chrome.i18n.getMessage('cancel')}</Button>}
        </div>
      </Space>
    </Space>
  );
};

const App: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);

  // run on first render
  useEffect(() => {
    setIsVisible(true);
  });

  return (
    <>
      <div
        style={{
          position: 'fixed',
          right: isCollapsed ? '-5px' : '-70px',
          top: '25vh',
          backgroundColor: '#fff',
          border: 'rgba(175,175,175,60%) 1px solid',
          borderTopLeftRadius: '15px',
          borderBottomLeftRadius: '15px',
          paddingRight: '5px',
          width: '70px',
          cursor: 'pointer',
          boxShadow: '2px 2px 5px rgba(0,0,0,45%)',
          opacity: isVisible ? 1 : 0,
          transition: 'right 0.5s ease-in-out, opacity 0.5s ease-in-out',
        }}
        onClick={() => setIsCollapsed(false)}
      >
        <img
          src={`chrome-extension://${chrome.runtime.id}/icon_512_512.png`}
          style={{
            width: '40px',
            height: '40px',
            margin: '5px',
            filter: 'drop-shadow(0 0 3px rgba(0,0,0,45%))',
            pointerEvents: 'none',
          }}
          alt=""
          draggable={false}
        />
      </div>
      <div
        style={{
          position: 'fixed',
          right: isCollapsed ? '-250px' : '-5px',
          top: '25vh',
          width: '250px',
          paddingRight: '5px',
          backgroundColor: '#fff',
          border: 'rgba(175,175,175,60%) 1px solid',
          borderTopLeftRadius: '15px',
          borderBottomLeftRadius: '15px',
          boxShadow: '2px 2px 5px rgba(0,0,0,45%)',
          opacity: isVisible ? 1 : 0,
          transition: 'right 0.5s ease-in-out, opacity 0.5s ease-in-out',
        }}
      >
        <Helper setIsCollapsed={setIsCollapsed} />
      </div>
    </>
  );
};

$(window).one('load', async () => {
  if (((await AppConfig.get(AppConfigKeys.enrollmentHelperEnabled)) as boolean) !== true) return;

  $('body').append(
    '<div id="enrollmentHelper_container" style="position: absolute; top: 0; left: 0; width: 0; height: 0; z-index: 999" />'
  );
  ReactDOM.render(<App />, document.getElementById('enrollmentHelper_container'));
});
