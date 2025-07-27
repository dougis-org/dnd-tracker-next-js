#!/bin/bash

# Monitor PR status until all checks pass and it auto-merges
PR_NUMBER=${1:-517}  # Use issue number as default
REPO="dougis-org/dnd-tracker-next-js"

echo "Monitoring PR #${PR_NUMBER} for ${REPO}..."
echo "GitHub PR URL: https://github.com/${REPO}/pull/${PR_NUMBER}"

# Function to check PR status
check_pr_status() {
  local pr_info=$(gh pr view ${PR_NUMBER} --repo ${REPO} --json state,mergeable,statusCheckRollup)
  local state=$(echo $pr_info | jq -r '.state')
  local mergeable=$(echo $pr_info | jq -r '.mergeable')
  local checks=$(echo $pr_info | jq -r '.statusCheckRollup[].state' | sort | uniq)
  
  echo "$(date): PR State: $state, Mergeable: $mergeable"
  echo "Check statuses: $checks"
  
  if [[ "$state" == "MERGED" ]]; then
    echo "✅ PR has been merged successfully!"
    return 0
  elif [[ "$checks" =~ "FAILURE" ]] || [[ "$checks" =~ "ERROR" ]]; then
    echo "❌ Some checks have failed. Manual intervention required."
    echo "Failed checks:"
    echo $pr_info | jq -r '.statusCheckRollup[] | select(.state != "SUCCESS") | "\(.name): \(.state)"'
    return 1
  elif [[ "$checks" =~ "PENDING" ]]; then
    echo "⏳ Checks still running..."
    return 2
  elif [[ "$checks" == "SUCCESS" ]] && [[ "$mergeable" == "MERGEABLE" ]]; then
    echo "✅ All checks passed! PR should auto-merge soon..."
    return 2
  else
    echo "🔄 Waiting for checks to complete..."
    return 2
  fi
}

# Monitor loop
while true; do
  if check_pr_status; then
    break
  elif [[ $? -eq 1 ]]; then
    echo "Stopping monitoring due to failed checks."
    exit 1
  fi
  
  echo "Sleeping 30 seconds before next check..."
  sleep 30
done

echo "PR monitoring complete."