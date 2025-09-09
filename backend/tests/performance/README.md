# How to run performance test:
Launch the backend container, then:

`sudo docker compose exec backend bash`

Inside the container, run:

`python -m tests.performance.benchmark`

After cleanup finished, transfer the .csv file from container using:

`sudo docker cp backend:/app/tests/performance/benchmarks.csv ./benchmarks.csv`