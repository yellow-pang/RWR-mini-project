#!/usr/bin/env ruby

require "yaml"

project_root = File.expand_path("../..", __dir__)
workflow = YAML.load_file(File.join(project_root, ".github/workflows/pipeline.yml"))
jobs = workflow.fetch("jobs")
validate = jobs.fetch("validate")
publish = jobs.fetch("publish")
deploy = jobs.fetch("deploy")
legacy_workflow = YAML.load_file(File.join(project_root, ".github/workflows/deploy.yml"))

def assert(condition, message)
  raise message unless condition
end

main_push_condition = "github.event_name == 'push' && github.ref == 'refs/heads/main'"
assert(publish.fetch("needs") == "validate", "publish job must wait for validation")
assert(publish.fetch("if") == main_push_condition, "publish job must run only for main push")
assert(deploy.fetch("needs") == "publish", "deploy job must wait for publish")
assert(deploy.fetch("if") == main_push_condition, "deploy job must run only for main push")
assert(deploy.fetch("runs-on") == ["self-hosted", "macOS", "ARM64", "rwr-production"], "deploy runner labels must select the Mac production runner")
assert(deploy.fetch("environment") == "production", "deploy job must use the production environment")
assert(deploy.fetch("timeout-minutes") >= 20, "deploy timeout must allow health checks and rollback to finish")
assert(deploy.fetch("concurrency").fetch("group") == "rwr-production-deploy", "production deployments must share one concurrency group")
assert(deploy.fetch("concurrency").fetch("queue") == "max", "a late older build must not cancel a queued latest deployment")
assert(deploy.fetch("concurrency").fetch("cancel-in-progress") == false, "running deployments must not be cancelled by a newer push")

validation_commands = validate.fetch("steps").map { |step| step["run"] }.compact
[
  "node --test server/tests/*.test.js",
  "bash scripts/tests/deploy-mac.test.sh",
  "ruby scripts/tests/workflow-deploy.test.rb",
  "bash scripts/tests/check-deploy-head.test.sh",
].each do |command|
  assert(validation_commands.include?(command), "validate job must run #{command}")
end

steps = deploy.fetch("steps")
checkout_index = steps.index { |step| step["uses"] == "actions/checkout@v7" }
assert(checkout_index, "deploy job must check out the workflow commit")

head_check_index = steps.index { |step| step["id"] == "deployment_head" }
assert(head_check_index, "deploy job must check the latest main SHA inside the concurrency group")
head_check = steps.fetch(head_check_index)
assert(head_check.fetch("env").fetch("DEPLOY_SHA") == "\${{ github.sha }}", "freshness check must use the workflow commit SHA")
assert(head_check.fetch("run") == 'bash scripts/check-deploy-head.sh "$DEPLOY_SHA"', "deploy job must run the tested freshness check")

deploy_index = steps.index { |step| step["name"] == "Deploy published SHA on Mac mini" }
assert(deploy_index, "deploy command step is missing")
assert(checkout_index < head_check_index && head_check_index < deploy_index, "main freshness must be checked after checkout and before deployment")
deploy_step = steps.fetch(deploy_index)
assert(deploy_step.fetch("if") == "steps.deployment_head.outputs.should_deploy == 'true'", "stale or failed main checks must not deploy")

command = deploy_step.fetch("run")
assert(command.include?("scripts/deploy-mac.sh"), "deploy job must call deploy-mac.sh")
assert(deploy_step.fetch("env").fetch("DEPLOY_SHA") == "\${{ github.sha }}", "deploy job must pass the workflow commit SHA")
assert(deploy_step.fetch("env").fetch("RWR_DEPLOY_DIR") == "\${{ vars.RWR_DEPLOY_DIR }}", "deploy job must use the configured fixed deployment directory")
assert(deploy_step.fetch("env").fetch("RWR_ENV_FILE") == "\${{ vars.RWR_ENV_FILE }}", "deploy job must reference the existing runtime env file")
%w[DEPLOY_SHA RWR_DEPLOY_DIR GITHUB_WORKSPACE RWR_ENV_FILE].each do |variable|
  assert(command.include?('"$' + variable + '"'), "deploy command must quote #{variable}")
end
assert(!command.include?("\${{"), "deploy command must receive workflow values through environment variables")
assert(!command.match?(/docker\s+(?:compose\s+)?build/), "deploy job must not build on the Mac runner")

assert(legacy_workflow.fetch("jobs").fetch("deploy").fetch("runs-on") == ["self-hosted", "Linux", "X64"], "legacy workflow must never select the Mac production runner")

puts "PASS: CI 테스트 연결, main publish, 배포 직렬화/최신 SHA 검사, Linux 전용 legacy workflow 계약"
