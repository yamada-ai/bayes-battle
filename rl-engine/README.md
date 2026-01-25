# RL Engine

Reinforcement learning engine for Bayes Battle, implementing:
- Generative Particle Belief Tracker
- Latent Action PPO Policy

## Setup

```bash
# Install dependencies
poetry install

# Run tests
poetry run pytest

# Format code
poetry run black .
```

## Structure

```
rl-engine/
├── belief/          # Particle filter implementation
├── policy/          # Latent action PPO
├── env/             # Gym environment wrapper
├── experiments/     # Training scripts
└── tests/           # Unit tests
```

## Usage

See main project README for detailed usage instructions.
