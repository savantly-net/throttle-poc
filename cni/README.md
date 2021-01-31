# Throttle by CNI

# TLDR;

The K8S nodes need Linux kernel v5.1 at least.  Until EKS with 1.19 is released, a custom AMI is required.  
Follow progress here -  
[https://github.com/awslabs/amazon-eks-ami/issues/357](https://github.com/awslabs/amazon-eks-ami/issues/357)  

Otherwise you will experience errors like this -  
With Calico after enabling the Bandwidth annotation    
`networkPlugin cni failed to set up pod XXXX network: adding link: invalid argument`  
and opened an issue here -  
[https://github.com/projectcalico/calico/issues/4357](https://github.com/projectcalico/calico/issues/4357)  

Cilium didn't complain about the bandwidth annotations, and seem to process them, but the 'Bandwidth Manager' stays disabled. 

I'm unsure of the Darwin requirements, and was unable to get success in Minikube on MacOS 10.14.6

## Prepare 

### Minikube

If using minikube, start it with CNI support  

```
$ minikube start --network-plugin=cni 
```


### EKS 
*Important* - 
Minimum Linux kernel version to support eBPF is 5.1   
The default AMI at this time of this writing uses 4.14, so a custom AMI should be used.  
You can also use the Bottlerocket AMI family, but there are limitations. [more info](https://docs.projectcalico.org/maintenance/ebpf/ebpf-and-eks)  

Canonical provides an Ubuntu AMI with Linux 5.4 that can be used if you want to skip creating your own.  
More info [about the Ubuntu EKS images here](https://cloud-images.ubuntu.com/aws-eks/)  

More info [about the EKS AMIs](https://github.com/awslabs/amazon-eks-ami)  

More info [using packer](https://learn.hashicorp.com/tutorials/packer/getting-started-build-image?in=packer/getting-started)

Example creating cluster with `eksctl`  

```
$ eksctl create cluster --name throttle-test --without-nodegroup --version 1.18 --with-oidc
```

*Note* you'll need to delete the `aws-node` CNI first   

```
$ kubectl delete daemonset -n kube-system aws-node
```

Add a node-group using a custom AMI [Ubuntu 20LTS shown here] 

```
$ eksctl create nodegroup --cluster throttle-test --node-type t3.small --node-ami-family Ubuntu2004 --max-pods-per-node 100
```

The nodes will not become ready until a CNI configuration is applied.  

## CNI install

Only use one of Calico or Cilium -  

### Calico
```
$ kubectl apply -f https://docs.projectcalico.org/manifests/calico-vxlan.yaml

configmap/calico-config created
customresourcedefinition.apiextensions.k8s.io/bgpconfigurations.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/bgppeers.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/blockaffinities.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/clusterinformations.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/felixconfigurations.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/globalnetworkpolicies.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/globalnetworksets.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/hostendpoints.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/ipamblocks.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/ipamconfigs.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/ipamhandles.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/ippools.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/kubecontrollersconfigurations.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/networkpolicies.crd.projectcalico.org created
customresourcedefinition.apiextensions.k8s.io/networksets.crd.projectcalico.org created
clusterrole.rbac.authorization.k8s.io/calico-kube-controllers created
clusterrolebinding.rbac.authorization.k8s.io/calico-kube-controllers created
clusterrole.rbac.authorization.k8s.io/calico-node created
clusterrolebinding.rbac.authorization.k8s.io/calico-node created
daemonset.apps/calico-node created
serviceaccount/calico-node created
deployment.apps/calico-kube-controllers created
serviceaccount/calico-kube-controllers created
poddisruptionbudget.policy/calico-kube-controllers created
```
See [here](https://docs.projectcalico.org/getting-started/kubernetes/managed-public-cloud/eks) for more information

### Cilium 

```
$ kubectl apply -f ./cilium.yml

serviceaccount/cilium created
serviceaccount/cilium-operator created
configmap/cilium-config created
clusterrole.rbac.authorization.k8s.io/cilium created
clusterrole.rbac.authorization.k8s.io/cilium-operator created
clusterrolebinding.rbac.authorization.k8s.io/cilium created
clusterrolebinding.rbac.authorization.k8s.io/cilium-operator created
daemonset.apps/cilium created
deployment.apps/cilium-operator created
``` 

Ensure the Bandwidth Manager is not disabled -  

```
$ kubectl exec -it -n kube-system cilium-xxxxx -- cilium status | grep BandwidthManager

BandwidthManager:       EDT with BPF   [ens5]
```

## Deploy 

Deploy the example pods   

```
$ kubectl apply -f kube.yml

pod/i-am-slow created
pod/i-am-fast created
pod/throttle-tester created
```
 


## Bandwidth test  

Execute the [test.sh script](../test.sh)  

Example output using Cilium -  
*Note* - Cilium ignores the ingress bandwidth annotation, and only applies it to the egress.  

```
Connecting to slow pod (10.0.1.56)
Connecting to host 10.0.1.56, port 5201
[  5] local 10.0.0.6 port 38378 connected to 10.0.1.56 port 5201
[ ID] Interval           Transfer     Bitrate         Retr  Cwnd
[  5]   0.00-1.00   sec  83.5 MBytes   700 Mbits/sec    0    521 KBytes
[  5]   1.00-2.00   sec  72.5 MBytes   608 Mbits/sec    0    365 KBytes
[  5]   2.00-3.00   sec  81.2 MBytes   682 Mbits/sec    0    626 KBytes
[  5]   3.00-4.00   sec  66.2 MBytes   556 Mbits/sec    0    834 KBytes
[  5]   4.00-5.00   sec  53.8 MBytes   451 Mbits/sec    0    487 KBytes
[  5]   5.00-6.00   sec  53.8 MBytes   451 Mbits/sec    6    348 KBytes
[  5]   6.00-7.00   sec  70.0 MBytes   587 Mbits/sec    0    487 KBytes
[  5]   7.00-8.00   sec  52.5 MBytes   440 Mbits/sec    0    487 KBytes
[  5]   8.00-9.00   sec  76.2 MBytes   640 Mbits/sec    7    261 KBytes
[  5]   9.00-10.00  sec  51.2 MBytes   430 Mbits/sec    7    330 KBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bitrate         Retr
[  5]   0.00-10.00  sec   661 MBytes   554 Mbits/sec   20             sender
[  5]   0.00-10.00  sec   658 MBytes   552 Mbits/sec                  receiver

iperf Done.

Connecting to fast pod (10.0.1.25)
Connecting to host 10.0.1.25, port 5201
[  5] local 10.0.0.6 port 45954 connected to 10.0.1.25 port 5201
[ ID] Interval           Transfer     Bitrate         Retr  Cwnd
[  5]   0.00-1.00   sec   134 MBytes  1.12 Gbits/sec    0   1.21 MBytes
[  5]   1.00-2.00   sec   375 MBytes  3.14 Gbits/sec   39    782 KBytes
[  5]   2.00-3.00   sec   412 MBytes  3.46 Gbits/sec    5   2.00 MBytes
[  5]   3.00-4.00   sec   391 MBytes  3.28 Gbits/sec   20    834 KBytes
[  5]   4.00-5.00   sec   499 MBytes  4.19 Gbits/sec    0   1.04 MBytes
[  5]   5.00-6.00   sec   576 MBytes  4.83 Gbits/sec    0    765 KBytes
[  5]   6.00-7.00   sec   509 MBytes  4.27 Gbits/sec    0   1.05 MBytes
[  5]   7.00-8.00   sec   571 MBytes  4.79 Gbits/sec    0   1.10 MBytes
[  5]   8.00-9.00   sec   575 MBytes  4.83 Gbits/sec    0    800 KBytes
[  5]   9.00-10.00  sec   581 MBytes  4.88 Gbits/sec    0    730 KBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bitrate         Retr
[  5]   0.00-10.00  sec  4.52 GBytes  3.88 Gbits/sec   64             sender
[  5]   0.00-10.00  sec  4.51 GBytes  3.88 Gbits/sec                  receiver

iperf Done.

```

Example output using Calico -  
The results were a little more erratic. The underlying implementations are surely different.  

```
Connecting to slow pod (172.16.41.129)
Connecting to host 172.16.41.129, port 5201
[  5] local 172.16.209.66 port 53606 connected to 172.16.41.129 port 5201
[ ID] Interval           Transfer     Bitrate         Retr  Cwnd
[  5]   0.00-1.00   sec  5.28 MBytes  44.2 Mbits/sec    0   1.02 MBytes
[  5]   1.00-2.00   sec  0.00 Bytes  0.00 bits/sec    0   1.03 MBytes
[  5]   2.00-3.00   sec  0.00 Bytes  0.00 bits/sec    0   1.02 MBytes
[  5]   3.00-4.00   sec  0.00 Bytes  0.00 bits/sec    0   1.02 MBytes
[  5]   4.00-5.00   sec  0.00 Bytes  0.00 bits/sec    0   1.02 MBytes
[  5]   5.00-6.00   sec  1.25 MBytes  10.5 Mbits/sec    0   1.03 MBytes
[  5]   6.00-7.00   sec  0.00 Bytes  0.00 bits/sec    0   1.02 MBytes
[  5]   7.00-8.00   sec  0.00 Bytes  0.00 bits/sec    0   1.02 MBytes
[  5]   8.00-9.00   sec  0.00 Bytes  0.00 bits/sec    0   1.02 MBytes
iperf3: error - control socket has closed unexpectedly
command terminated with exit code 1

Connecting to fast pod (172.16.41.130)
Connecting to host 172.16.41.130, port 5201
[  5] local 172.16.209.66 port 49508 connected to 172.16.41.130 port 5201
[ ID] Interval           Transfer     Bitrate         Retr  Cwnd
[  5]   0.00-1.00   sec   269 MBytes  2.26 Gbits/sec    8   3.45 MBytes
[  5]   1.00-2.00   sec  11.2 MBytes  94.4 Mbits/sec    0   2.31 MBytes
[  5]   2.00-3.00   sec  12.5 MBytes   105 Mbits/sec    0    156 KBytes
[  5]   3.00-4.00   sec  11.2 MBytes  94.4 Mbits/sec    0    139 KBytes
[  5]   4.00-5.00   sec  12.5 MBytes   105 Mbits/sec    0    156 KBytes
[  5]   5.00-6.00   sec  11.2 MBytes  94.4 Mbits/sec    0    139 KBytes
[  5]   6.00-7.00   sec  12.5 MBytes   105 Mbits/sec    0    122 KBytes
[  5]   7.00-8.00   sec  11.2 MBytes  94.4 Mbits/sec    0    139 KBytes
[  5]   8.00-9.00   sec  12.5 MBytes   105 Mbits/sec    0    156 KBytes
[  5]   9.00-10.00  sec  11.2 MBytes  94.4 Mbits/sec    0    139 KBytes
- - - - - - - - - - - - - - - - - - - - - - - - -
[ ID] Interval           Transfer     Bitrate         Retr
[  5]   0.00-10.00  sec   375 MBytes   315 Mbits/sec    8             sender
[  5]   0.00-10.01  sec   372 MBytes   312 Mbits/sec                  receiver

iperf Done.
```