import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
  vus: 500,
  duration: '10m'
};

export default function () {
  http.post('https://demo-shop/api/login');
  http.get('https://demo-shop/api/search?q=laptop');
  http.post('https://demo-shop/api/cart');
  http.post('https://demo-shop/api/checkout');
  sleep(1);
}
