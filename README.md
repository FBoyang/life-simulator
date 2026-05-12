# Digital Fly - Tiny Connectome Simulator

A small browser-based virtual fruit fly demo inspired by connectome-style leaky integrate-and-fire simulation.

## Run it

From this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## What to try

1. Watch the fly drift toward the sugar source.
2. Turn on the bitter source and see the path bend away from it.
3. Silence `SEEK` to weaken sugar-seeking behavior.
4. Silence `AVOID` to weaken bitter avoidance.
5. Silence `FORWARD` to make locomotion much weaker.

## Biological analogy

Sensory neurons receive environmental input, the tiny connectome propagates spikes, and motor neurons shape the fly's movement. Silencing a neuron removes its spiking output so you can test which parts of the circuit are causally important.
