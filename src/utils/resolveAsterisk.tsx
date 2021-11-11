import { ReactNode } from 'react';
import * as React from 'react';

const resolveAsterisks = (text: string): ReactNode =>
  text.split('**').map((item, index) => (
    <span key={index} style={{ fontWeight: index % 2 === 0 ? 400 : 700 }}>
      {item.split('*').map((text, index) => (
        <span key={index} style={{ fontStyle: index % 2 === 0 ? 'normal' : 'italic' }}>
          {text}
        </span>
      ))}
    </span>
  ));

export { resolveAsterisks };
