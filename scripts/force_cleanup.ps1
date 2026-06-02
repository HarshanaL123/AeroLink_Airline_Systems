$Regions = @("eu-west-1", "us-east-1")

foreach ($region in $Regions) {
    Write-Host "Cleaning up ALBs in $region..." -ForegroundColor Yellow
    $ALBs = aws elbv2 describe-load-balancers --region $region --query "LoadBalancers[?contains(LoadBalancerName, 'aerolink')].[LoadBalancerArn]" --output text
    
    if ($ALBs) {
        foreach ($alb in $ALBs) {
            Write-Host "Deleting ALB: $alb" -ForegroundColor Red
            aws elbv2 delete-load-balancer --load-balancer-arn $alb --region $region
        }
        Start-Sleep -Seconds 10
    } else {
        Write-Host "No stranded ALBs found in $region." -ForegroundColor Green
    }

    Write-Host "Cleaning up Target Groups in $region..." -ForegroundColor Yellow
    $TGs = aws elbv2 describe-target-groups --region $region --query "TargetGroups[?contains(TargetGroupName, 'k8s-default-aerolink')].[TargetGroupArn]" --output text
    if ($TGs) {
        foreach ($tg in $TGs) {
            Write-Host "Deleting Target Group: $tg" -ForegroundColor Red
            aws elbv2 delete-target-group --target-group-arn $tg --region $region
        }
    }

    Write-Host "Cleaning up Security Groups in $region..." -ForegroundColor Yellow
    $VpcId = aws ec2 describe-vpcs --region $region --filters "Name=tag:Name,Values=AeroLink-VPC-dev*" --query "Vpcs[0].VpcId" --output text
    if ($VpcId -and $VpcId -ne "None") {
        $SGs = aws ec2 describe-security-groups --region $region --filters "Name=vpc-id,Values=$VpcId" "Name=group-name,Values=k8s-*" --query "SecurityGroups[*].GroupId" --output text
        if ($SGs) {
            foreach ($sg in $SGs) {
                Write-Host "Deleting Security Group: $sg" -ForegroundColor Red
                aws ec2 delete-security-group --group-id $sg --region $region
            }
        }
    }
}
Write-Host "Cleanup Complete!" -ForegroundColor Green
