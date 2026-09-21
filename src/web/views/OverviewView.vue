<script setup lang="ts">
import { computed } from "vue";

import { ago, stamp } from "@/shared/format";
import { state } from "../session";

/** 账号卡下方那行小注：有已注销的账号时额外点出来 */
const usersNote = computed(() =>
  state.stats.deleted > 0 ? `登记的总数 · 其中 ${state.stats.deleted} 个已注销` : "登记的总数"
);
</script>

<template>
  <section class="view" :class="{ on: state.view === 'overview' }">
    <div class="doc-head">
      <div>
        <h1>总览</h1>
        <p>登记在册的账号、通行设备与未用的邀请函</p>
      </div>
      <div class="doc-meta">
        登记处 <b>user-center</b><br />
        数据实时 · 令牌 15 分钟
      </div>
    </div>

    <div class="figs">
      <div class="fig">
        <div class="fig-key">账号</div>
        <div class="fig-val">{{ state.stats.users }}</div>
        <div class="fig-note">{{ usersNote }}</div>
      </div>
      <div class="fig">
        <div class="fig-key">已封禁</div>
        <div class="fig-val warn">{{ state.stats.banned }}</div>
        <div class="fig-note">拒绝放行</div>
      </div>
      <div class="fig">
        <div class="fig-key">在用设备</div>
        <div class="fig-val">{{ state.stats.devices }}</div>
        <div class="fig-note">持有有效令牌</div>
      </div>
      <div class="fig">
        <div class="fig-key">可用邀请函</div>
        <div class="fig-val">{{ state.stats.invites }}</div>
        <div class="fig-note">尚有余量</div>
      </div>
    </div>

    <div class="bar"><div class="bar-title">最近查验证录</div></div>
    <div class="ledger">
      <table>
        <thead>
          <tr>
            <th>时刻</th>
            <th>邮箱</th>
            <th>来源</th>
            <th style="text-align: right">结果</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(a, i) in state.attempts" :key="i">
            <td class="mute num">{{ stamp(a.at) }}<div class="sub">{{ ago(a.at) }}</div></td>
            <td><div class="mail">{{ a.email }}</div></td>
            <td class="mute num">{{ a.ip }}</td>
            <td style="text-align: right">
              <span class="stamp" :class="a.ok ? 'ok' : 'no'">{{ a.ok ? "放行" : "拒绝" }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
