# Throttling POC

### Insights

Works fine running locally, outside K8S.  
The `sudo ip link set dev ifb0 up` prompts me for a password, and after entering it - everything starts as expected.  
There is a shutdown hook in the app that cleans up.  

When deployed to minikube, I get an error when it spawns sudo -  

```
failed to throttle Error: spawn sudo ENOENT
    at Process.ChildProcess._handle.onexit (internal/child_process.js:269:19)
    at onErrorNT (internal/child_process.js:465:16)
    at processTicksAndRejections (internal/process/task_queues.js:80:21) {
  errno: -2,
  code: 'ENOENT',
  syscall: 'spawn sudo',
  path: 'sudo',
  spawnargs: [ 'ip', 'link', 'set', 'dev', 'ifb0', 'up' ],
  cmd: 'sudo ip link set dev ifb0 up',
  stdout: '',
  stderr: ''
}
```

I realize this can be an issue on a cluster, even if the correct privileges are available.  
As the containers could be stepping on each other [am I understanding this correctly?]  

One option might be to run a Daemonset that can setup traffic shaping using bash commands.   
Maybe something like this - [https://serverfault.com/a/731404/257947](https://serverfault.com/a/731404/257947)  

Or Istio's Fault injection [https://istio.io/latest/docs/concepts/traffic-management/#fault-injection](https://istio.io/latest/docs/concepts/traffic-management/#fault-injection)  


Another option is the K8S CNI plugin for traffic shaping -  

The deployment/pod config in K8S provides ingress/egress throttling  and burst allowance by annotation.  

Example -
```
apiVersion: v1
kind: Pod
metadata:
  annotations:
    kubernetes.io/ingress-bandwidth: 1M
    kubernetes.io/egress-bandwidth: 1M
```

Traffic shaping documentation -  
[https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/#support-traffic-shaping](https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/#support-traffic-shaping)

Looks like Calico and Cilium both support it -  
[https://docs.cilium.io/en/v1.9/gettingstarted/bandwidth-manager/](https://docs.cilium.io/en/v1.9/gettingstarted/bandwidth-manager/)  

Some nice Cilium instructions for EKS -
[https://docs.cilium.io/en/v1.9/gettingstarted/aws-eni/](https://docs.cilium.io/en/v1.9/gettingstarted/aws-eni/)  

