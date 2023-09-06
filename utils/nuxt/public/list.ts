import { VisitorsDb } from "utils/api";
import { CommonItem, processEncryptDecrypt } from "~/utils/common";
import { DBOperate, deepClone, fetchList, useCurrentTab, translateT, useFuckTitle } from "~/utils/nuxt";
import config from "~/config";

/**
 * 列表页面通用功能
 */
export async function useListPage<T extends CommonItem> () {
  const githubToken = useGithubToken();
  const encryptor = useEncryptor();
  const targetTab = useCurrentTab();
  const resultList = reactive([]) as T[];

  useFuckTitle(computed(() => translateT(targetTab.name) + config.SEO_title));

  const { data: list } = await fetchList(targetTab.url);
  resultList.splice(0, 0, ...list.value.map((item) => {
    return deepClone({
      ...item,
      _show: true,
      visitors: 0
    }) as T;
  }));

  DBOperate<VisitorsDb[]>({
    apiPath: "/db/get-visitors",
    query: { type: targetTab.url },
    callback: (data) => {
      resultList.forEach((item) => {
        item.visitors = data.find(i => i.nid === item.id)?.nvisitors || 0;
      });
    }
  });

  // 有token或者密码正确，显示加密的item
  watch([githubToken, encryptor.passwdCorrect], ([hasToken, hasPwd]) => {
    resultList.forEach((item) => {
      item._show = !item.encrypt || (!!hasToken || hasPwd);
    });
  }, { immediate: true });

  // 解密列表数据
  encryptor.decryptOrWatchToDecrypt(async (decrypt) => {
    for (const item of resultList) {
      if (item.encrypt) {
        await processEncryptDecrypt(item, decrypt, targetTab.url);
      }
    }
  });
  return resultList;
}
