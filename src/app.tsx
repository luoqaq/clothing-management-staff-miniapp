import React from 'react';
import './app.scss';

function App(props: React.PropsWithChildren) {
  const { children } = props;
  return children;
}

export default App;
