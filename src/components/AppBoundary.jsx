import React from 'react';
export default class AppBoundary extends React.Component{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<main className="app-loading"><div><h1>Let’s reconnect your workspace.</h1><p>This page could not load. A new version may be available.</p><p>Your browser files are still stored on this device.</p><button onClick={()=>window.location.reload()}>Reload Buildora</button><a href="/">Go to homepage</a></div></main>:this.props.children}
}
