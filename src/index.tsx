import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

const TestComponent = () => <div>App rodando!</div>;

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <BrowserRouter basename="/">
    <TestComponent />
  </BrowserRouter>
);
