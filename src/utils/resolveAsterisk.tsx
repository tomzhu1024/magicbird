import { ReactNode } from 'react';
import * as React from 'react';

const resolveAsterisks = (text: string): ReactNode =>
  text.split('**').map((item, index) => (
    <>
      {item.split('*').map((text, index2) => (
        <span
          key={index2 + index * item.length}
          style={{ fontWeight: index % 2 === 0 ? 400 : 700, fontStyle: index2 % 2 === 0 ? 'normal' : 'italic' }}
        >
          {text}
        </span>
      ))}
    </>
  ));

export { resolveAsterisks };
