## 项目描述

这是一个使用AI生成slidev幻灯片的一体式平台。


frontend为前端，使用vue编写，使用了tailwindcss，并且引入了i18n插件，任何展示在前端的内容均不要直接写文字，而是使用i18n的格式，先在frontend\src\i18n的几个json中新建对应的key-value，然后在代码中使用t函数。


backend为后端，使用nestjs编写。