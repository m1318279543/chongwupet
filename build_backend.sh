#!/usr/bin/env bash
# 后端打包助手：Git Bash 下 mvn 脚本会因 classworlds 路径解析失败，这里直接用 java 启动器
# 用法: bash build_backend.sh clean package -DskipTests
set -eu
JAVA="D:/Undergraduate_courses/jdk-17/jdk-17.0.20.1+1/bin/java.exe"
MAVEN_HOME="D:/Undergraduate_courses/apache-maven-3.9.16"
ROOT="D:/Undergraduate_courses/qiyekaifa/chongwupet/ruoyi"

cd "$ROOT"
"$JAVA" \
  -classpath "$MAVEN_HOME/boot/plexus-classworlds-2.11.0.jar" \
  -Dclassworlds.conf="$MAVEN_HOME/bin/m2.conf" \
  -Dmaven.home="$MAVEN_HOME" \
  -Dmaven.multiModuleProjectDirectory="$ROOT" \
  org.codehaus.plexus.classworlds.launcher.Launcher "$@"
