# Throttle by CNI

# TLDR;

Had problems with Calico after enabling the Bandwidth annotation    
`networkPlugin cni failed to set up pod XXXX network: adding link: invalid argument`  
and opened an issue here -  
[https://github.com/projectcalico/calico/issues/4357](https://github.com/projectcalico/calico/issues/4357)  

Cilium didn't complain about the bandwidth annotations, and seem to process them, but the 'Bandwidth Manager' stays disabled, even when I explicity enabled it in the ConfigMap.  
I've reached out for assistance on the Cilium Slack channel.  

## Prepare 

### Minikube

If using minikube, start it with CNI support  

```
minikube start --network-plugin=cni 
```


### EKS 

*Note* you'll need to delete the `aws-node` CNI first   

```
kubectl delete daemonset -n kube-system aws-node
```

## CNI install

Only use one of these -  

### Calico
```
kubectl apply -f https://docs.projectcalico.org/manifests/calico-vxlan.yaml
```
See [here](https://docs.projectcalico.org/getting-started/kubernetes/managed-public-cloud/eks) for more information

### Cilium 
```
kubectl apply -f ./cilium.yml
```

## Deploy 

Deploy the example pods   

```
kubectl apply -f kube.yml
```

*Note* if you have existing nodes, you may to terminate/restart them them after configuration of Calico.  


## Bandwidth test  

Execute the [test.sh script](./test.sh)  

Example Output - 

```
kubectl exec throttle-tester -- /bin/sh -c 'iperf3 -c slow-svc'

```
