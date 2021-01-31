#!/bin/bash


HOST=$(kubectl get pod i-am-slow -o jsonpath='{.status.podIP}')
echo "Connecting to slow pod ($HOST)"
kubectl exec -it throttle-tester -- iperf3 -c $HOST $@
echo

HOST=$(kubectl get pod i-am-fast -o jsonpath='{.status.podIP}')
echo "Connecting to fast pod ($HOST)"
kubectl exec -it throttle-tester -- iperf3 -c $HOST $@
echo