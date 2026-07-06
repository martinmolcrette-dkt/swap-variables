import { h, render } from 'preact';
import '@create-figma-plugin/ui/css/base.css';
import './styles.css';
import './linter.css';
import { App } from './App';

render(<App />, document.getElementById('app')!);
