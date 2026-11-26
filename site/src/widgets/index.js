import { topology, osi, signal, bits } from './basics.js';
import { subnet, subnetPractice, switchSim, lpm, dijkstra } from './addressing.js';
import { tcp, cwnd } from './transport.js';
import { dns, http, tls, nat, firewall } from './apps.js';
import { terminal } from './terminal.js';
import { wifi, loadbalancer } from './pro.js';
import { ipv6, vlan, vpn, email } from './net2.js';

export const WIDGETS = {
  topology, osi, signal, bits,
  subnet, 'subnet-practice': subnetPractice, switch: switchSim, lpm, dijkstra,
  tcp, cwnd, dns, http, tls, nat, firewall,
  terminal, wifi, loadbalancer,
  ipv6, vlan, vpn, email,
};

/** Replace every [data-widget] placeholder inside root with its live widget. */
export function mountWidgets(root) {
  root.querySelectorAll('[data-widget]').forEach((el) => {
    const fn = WIDGETS[el.dataset.widget];
    if (!fn) return;
    const holder = document.createElement('div');
    holder.className = 'widget-holder';
    holder.style.margin = '28px 0';
    el.replaceWith(holder);
    try { fn(holder); } catch (e) { console.error('widget failed', el.dataset.widget, e); holder.innerHTML = '<p class="callout warn">This interactive failed to load.</p>'; }
  });
}
