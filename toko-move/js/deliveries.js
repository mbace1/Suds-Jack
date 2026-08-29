// Authored Central Helsinki jobs. The board stays readable: one active job at a time,
// then the routes stretch progressively farther across the city.
export const DELIVERY_TARGET = 10;

export const JOBS = [
  { from: 'hakaniemi', to: 'rautatientori', label: 'Documents to the station' },
  { from: 'rautatientori', to: 'kamppi', label: 'Parcel to Kamppi' },
  { from: 'kamppi', to: 'toolontori', label: 'Food delivery to Töölö' },
  { from: 'toolontori', to: 'pasila', label: 'Parts to Pasila' },
  { from: 'pasila', to: 'sornainen', label: 'Rush package to Sörnäinen' },
  { from: 'sornainen', to: 'kalasatama', label: 'Shop delivery to Kalasatama' },
  { from: 'kalasatama', to: 'kauppatori', label: 'Fresh delivery to Market Square' },
  { from: 'kauppatori', to: 'rautatientori', label: 'Courier run to the centre' },
  { from: 'rautatientori', to: 'kallionkirkko', label: 'Pickup for Kallio' },
  { from: 'kallionkirkko', to: 'kamppi', label: 'Final run across town' },
];

export class DeliveryChallenge {
  constructor(flow, say) { this.flow = flow; this.say = say; this.index = 0; this.active = null; this.seen = new Set(); }
  start() { this.launch(); }
  launch() {
    if (this.index >= JOBS.length) return false;
    const job = JOBS[this.index];
    this.flow.inject(job.from, job.to, { kind: 'delivery', job: this.index, label: job.label, n: 1 });
    this.active = job;
    this.say(`${this.index + 1}/${DELIVERY_TARGET} · ${this.name(job.from)} → ${this.name(job.to)} · ${job.label}`);
    return true;
  }
  step() {
    for (const trip of this.flow.trips.completed) {
      if (!trip.payload || trip.payload.kind !== 'delivery' || this.seen.has(trip.id)) continue;
      this.seen.add(trip.id);
      if (trip.payload.job !== this.index) continue;
      this.index += 1; this.active = null;
      if (this.index < JOBS.length) this.launch();
      return true;
    }
    return false;
  }
  get complete() { return this.index >= DELIVERY_TARGET; }
  name(id) { return this.flow.graph.node(id)?.name || id; }
}
