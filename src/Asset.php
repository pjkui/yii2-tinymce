<?php
namespace pjkui\Yii2Tinymce;

class Asset extends \yii\web\AssetBundle
{
    public $sourcePath = '@bower/tinymce';

    public $js = [
        'tinymce.min.js',
    ];
}
