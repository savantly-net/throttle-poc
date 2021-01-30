
## Prepare 

### Minikube

If using minikube, start it with CNI support  

```
minikube start --network-plugin=cni 
# and apply the Calico manifest
kubectl apply -f https://docs.projectcalico.org/manifests/calico-vxlan.yaml
```


### EKS 

*Note* you'll need to delete the `aws-node` CNI first   

```
kubectl delete daemonset -n kube-system aws-node
```

Apply Calico -  

```
kubectl apply -f https://docs.projectcalico.org/manifests/calico-vxlan.yaml
```

See [here](https://docs.projectcalico.org/getting-started/kubernetes/managed-public-cloud/eks) for more information

## Deploy 

Deploy the example pods   

```
kubectl apply -f kube.yml
```

*Note* if you have existing nodes, you may to terminate/restart them them after configuration of Calico.  


## Bandwidth test  

```
kubectl exec throttle-tester -- /bin/sh -c 'iperf3 -c throttle-poc'
```

